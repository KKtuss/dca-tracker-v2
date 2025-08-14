import { Connection, PublicKey } from '@solana/web3.js';

// Helper function to get raw body for Vercel
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  console.log('Solana scan endpoint called:', {
    method: req.method,
    origin: req.headers.origin,
    headers: req.headers
  });

  // Set ALL CORS headers explicitly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.status(200).json({
      success: true,
      message: 'OPTIONS preflight successful',
      timestamp: new Date().toISOString(),
      method: 'OPTIONS',
      cors: 'enabled'
    });
    return;
  }

  // Log request details for debugging
  console.log(`[${new Date().toISOString()}] ${req.method} request to /api/solana-scan`);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);

  // Check if body exists and parse it
  let body = req.body;
  
  // If body is undefined but we have JSON content-type, try to parse it
  if (!body && req.headers['content-type'] === 'application/json') {
    try {
      // For Vercel, sometimes the body needs to be parsed from raw
      const rawBody = await getRawBody(req);
      if (rawBody) {
        body = JSON.parse(rawBody.toString());
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Request body must be valid JSON',
        parseError: parseError.message
      });
    }
  }
  
  // If still no body, return error
  if (!body) {
    return res.status(400).json({
      success: false,
      error: 'Request body is missing',
      message: 'Please ensure Content-Type is application/json and body is valid JSON',
      receivedBody: req.body,
      contentType: req.headers['content-type']
    });
  }

  try {
    const { scanType, scanDepth, walletAddress, batchWallets, rpcEndpoint, test } = body || {};

    // Handle test request
    if (test) {
      console.log('Test request received, responding with success');
      return res.status(200).json({
        success: true,
        message: 'Backend API is working correctly',
        timestamp: new Date().toISOString(),
        cors: 'enabled',
        origin: req.headers.origin || 'unknown',
        bodyReceived: !!body,
        bodyType: typeof body
      });
    }

    // OPTIMIZATION: Limit scan depth to prevent timeouts
    const limitedScanDepth = Math.min(scanDepth || 100, 500); // Max 500 transactions
    
    // Use Helius RPC or fallback to public
    const endpoint = rpcEndpoint || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(endpoint, 'confirmed');

    let results = [];

    // OPTIMIZATION: Add overall timeout for the entire scan
    const scanPromise = (async () => {
      if (scanType === 'recent') {
        results = await scanRecentTransactions(connection, limitedScanDepth);
      } else if (scanType === 'specific') {
        results = await scanSpecificWallet(connection, walletAddress, limitedScanDepth);
      } else if (scanType === 'batch') {
        results = await scanBatchWallets(connection, batchWallets, limitedScanDepth);
      }
    })();

    // 60 second overall timeout
    await Promise.race([
      scanPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scan timeout - too many transactions to analyze')), 60000)
      )
    ]);

    res.status(200).json({
      success: true,
      data: results,
      message: `Found ${results.length} wallets with insider patterns`,
      scanDepth: limitedScanDepth,
      performance: 'Optimized for speed - limited to 500 transactions max'
    });

  } catch (error) {
    console.error('Backend scan error:', error);
    
    // Better error messages for timeouts
    let errorMessage = error.message;
    if (error.message.includes('timeout')) {
      errorMessage = 'Scan timed out - try reducing scan depth or use specific wallet scan instead';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Scan failed on backend',
      recommendation: 'For faster results, try scanning specific wallets or reduce scan depth to 100-200 transactions'
    });
  }
}

// Scan recent transactions for insider wallets
async function scanRecentTransactions(connection, depth) {
  const results = [];
  
  try {
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    
    // OPTIMIZATION: Reduce the number of signatures to analyze for speed
    const tokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const signatures = await connection.getSignaturesForAddress(
      tokenProgram,
      { limit: Math.min(depth, 50) } // Reduced from 100 to 50 for speed
    );

    // OPTIMIZATION: Analyze fewer transactions (max 10 instead of 20)
    const maxTransactions = Math.min(signatures.length, 10);
    
    // Analyze each transaction for insider patterns
    for (let i = 0; i < maxTransactions; i++) {
      try {
        const signature = signatures[i];
        
        // OPTIMIZATION: Add timeout for transaction fetch
        const txPromise = connection.getTransaction(signature.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        const tx = await Promise.race([
          txPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction timeout')), 8000)
          )
        ]);

        if (tx && tx.meta && tx.transaction.message.accountKeys.length > 0) {
          // Extract wallet addresses from transaction
          const wallets = tx.transaction.message.accountKeys.slice(0, 2); // Reduced from 3 to 2
          
          for (const wallet of wallets) {
            const walletData = await analyzeWalletForInsiderPatterns(connection, wallet.toString(), 50); // Reduced depth to 50
            if (walletData && walletData.isInsider) {
              results.push(walletData);
            }
          }
        }

        // OPTIMIZATION: Better rate limiting
        await new Promise(resolve => setTimeout(resolve, 200)); // Increased from 100ms to 200ms
        
      } catch (txError) {
        console.warn('Transaction analysis failed:', txError.message);
        continue;
      }
    }

  } catch (error) {
    console.error('Recent transactions scan failed:', error);
    throw error;
  }

  return results;
}

// Scan specific wallet
async function scanSpecificWallet(connection, walletAddress, depth) {
  try {
    const walletData = await analyzeWalletForInsiderPatterns(connection, walletAddress, depth);
    return walletData ? [walletData] : [];
  } catch (error) {
    console.error('Specific wallet scan failed:', error);
    throw error;
  }
}

// Scan batch wallets
async function scanBatchWallets(connection, wallets, depth) {
  const results = [];
  
  for (const wallet of wallets) {
    try {
      const walletData = await analyzeWalletForInsiderPatterns(connection, wallet, depth);
      if (walletData) {
        results.push(walletData);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.warn('Batch wallet analysis failed:', wallet, error.message);
      continue;
    }
  }

  return results;
}

// Analyze wallet for insider patterns
async function analyzeWalletForInsiderPatterns(connection, walletAddress, depth = 100) {
  try {
    const publicKey = new PublicKey(walletAddress);
    
    // Get account info
    const accountInfo = await connection.getAccountInfo(publicKey);
    if (!accountInfo) return null;

    // Get transaction history with user-selectable depth
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: depth });
    
    // Get balance
    const balance = accountInfo.lamports / 1e9; // Convert lamports to SOL
    
    // Analyze real token holdings
    const tokenAnalysis = await analyzeTokenHoldings(connection, publicKey, signatures);
    
    // Check if wallet is a potential insider
    const insiderAnalysis = await checkInsiderCriteria(connection, publicKey, signatures);
    
    return {
      address: walletAddress,
      balance: balance.toFixed(4),
      transactions: signatures.length,
      tokens: tokenAnalysis.tokenCount,
      isInsider: insiderAnalysis.isInsider,
      insiderReason: insiderAnalysis.reason,
      quickTrades: insiderAnalysis.quickTrades,
      earlyPlays: insiderAnalysis.earlyPlays,
      successRate: insiderAnalysis.successRate.toFixed(1),
      washTradeVolume: insiderAnalysis.washTradeVolume,
      totalProfit: insiderAnalysis.totalProfit.toFixed(2),
      detectedPatterns: insiderAnalysis.patterns,
      analysisDepth: depth
    };

  } catch (error) {
    console.warn('Wallet analysis failed:', walletAddress, error.message);
    return null;
  }
}

// Analyze real token holdings
async function analyzeTokenHoldings(connection, publicKey, signatures) {
  try {
    // Get token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });
    
    // Count non-zero token accounts
    const activeTokens = tokenAccounts.value.filter(account => 
      account.account.data.parsed.info.tokenAmount.uiAmount > 0
    );
    
    return {
      tokenCount: activeTokens.length,
      tokenAccounts: activeTokens
    };
  } catch (error) {
    console.warn('Token analysis failed:', error.message);
    return { tokenCount: 0, tokenAccounts: [] };
  }
}



// Check if wallet meets insider criteria
async function checkInsiderCriteria(connection, publicKey, signatures) {
  try {
    let quickTrades = 0;        // Trades with <1min hold time
    let earlyPlays = 0;         // Successful early entries (profitable trades)
    let totalTrades = 0;        // Total analyzed trades
    let successfulTrades = 0;   // Profitable trades
    let totalProfit = 0;        // Total profit from trades
    let washTradeVolume = 0;    // Volume of quick trades (potential wash trading)
    
    // OPTIMIZATION: Analyze fewer transactions for speed (max 50 instead of 100)
    const maxTransactions = Math.min(signatures.length, 50);
    
    // Analyze recent transactions for insider patterns
    for (let i = 0; i < maxTransactions; i++) {
      try {
        // OPTIMIZATION: Add timeout for each transaction fetch
        const txPromise = connection.getTransaction(signatures[i].signature, {
          maxSupportedTransactionVersion: 0
        });
        
        // 5 second timeout per transaction
        const tx = await Promise.race([
          txPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction timeout')), 5000)
          )
        ]);
        
        if (tx && tx.meta && tx.meta.preBalances && tx.meta.postBalances) {
          totalTrades++;
          
          // Calculate profit/loss
          const preBalance = tx.meta.preBalances[0];
          const postBalance = tx.meta.postBalances[0];
          const balanceChange = postBalance - preBalance;
          
          if (balanceChange > 0) {
            successfulTrades++;
            totalProfit += balanceChange / 1e9;
          }
          
          // Check for quick flipping (hold time <1min) - this is wash trading
          if (i > 0 && signatures[i-1].blockTime && signatures[i].blockTime) {
            const timeDiff = Math.abs(signatures[i-1].blockTime - signatures[i].blockTime);
            
            if (timeDiff <= 60) { // 1 minute or less
              quickTrades++;
              // Add to wash trade volume (absolute value since wash trades can be losses)
              washTradeVolume += Math.abs(balanceChange) / 1e9;
            }
          }
          
          // Check for early entry indicators (high fee + profitable = early play)
          if (tx.meta.fee > 10000 && balanceChange > 0) { // High fee + profit indicates early entry
            earlyPlays++;
          }
          
          // Check for token program interactions (indicates token trading)
          if (tx.transaction.message.accountKeys.some(key => 
            key.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
          )) {
            // This is a token trade - if profitable, could be early entry
            if (balanceChange > 0) {
              earlyPlays++;
            }
          }
        }
        
        // OPTIMIZATION: Add small delay between requests to avoid rate limiting
        if (i % 5 === 0) { // Every 5th transaction
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (txError) {
        console.warn(`Transaction ${i} failed:`, txError.message);
        continue;
      }
    }
    
    // Calculate success rate (should be LOW for insiders due to wash trading)
    const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
    
    // INSIDER CRITERIA: Must meet these conditions
    const isInsider = (
      quickTrades >= 10 &&          // At least 10 quick trades (wash trading volume)
      earlyPlays >= 2 &&            // At least 2 early plays (hidden among wash trades)
      successRate <= 50 &&          // Low success rate due to wash trading
      totalTrades >= 30             // High transaction volume to mask patterns
    );
    
    // Determine reason for classification
    let reason = '';
    if (isInsider) {
      reason = `INSIDER: ${quickTrades} wash trades, ${earlyPlays} early plays, ${successRate.toFixed(1)}% win rate (low due to wash trading)`;
    } else {
      const missing = [];
      if (quickTrades < 10) missing.push(`Need ${10-quickTrades} more wash trades`);
      if (earlyPlays < 2) missing.push(`Need ${2-earlyPlays} more early plays`);
      if (successRate > 50) missing.push(`Win rate too high (${successRate.toFixed(1)}%) - insiders have low rates`);
      if (totalTrades < 30) missing.push(`Need ${30-totalTrades} more total trades`);
      reason = `NOT INSIDER: ${missing.join(', ')}`;
    }
    
    // Get detected patterns
    const patterns = [];
    if (quickTrades >= 10) patterns.push('High Wash Trading');
    if (earlyPlays >= 2) patterns.push('Hidden Early Plays');
    if (successRate <= 50) patterns.push('Low Win Rate (Wash Trading)');
    if (totalTrades >= 30) patterns.push('High Transaction Volume');
    
    return {
      isInsider,
      reason,
      quickTrades,
      earlyPlays,
      successRate,
      washTradeVolume: washTradeVolume.toFixed(2),
      totalProfit,
      patterns,
      totalTrades,
      successfulTrades
    };
    
  } catch (error) {
    console.warn('Insider criteria check failed:', error.message);
    return {
      isInsider: false,
      reason: 'Analysis failed',
      quickTrades: 0,
      earlyPlays: 0,
      successRate: 0,
      washTradeVolume: '0.00',
      totalProfit: 0,
      patterns: [],
      totalTrades: 0,
      successfulTrades: 0
    };
  }
}


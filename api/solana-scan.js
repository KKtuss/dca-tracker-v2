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

  // Handle preflight OPTIONS request FIRST
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'false',
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      success: true,
      message: 'OPTIONS preflight successful',
      timestamp: new Date().toISOString(),
      method: 'OPTIONS',
      cors: 'enabled'
    }));
    return;
  }

  // Set CORS headers for all other requests
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
    'Content-Type': 'application/json'
  });

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
      res.end(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Request body must be valid JSON',
        parseError: parseError.message
      }));
      return;
    }
  }
  
  // If still no body, return error
  if (!body) {
    res.end(JSON.stringify({
      success: false,
      error: 'Request body is missing',
      message: 'Please ensure Content-Type is application/json and body is valid JSON',
      receivedBody: req.body,
      contentType: req.headers['content-type']
    }));
    return;
  }

  try {
    const { scanType, scanDepth, walletAddress, batchWallets, rpcEndpoint, test } = body || {};

    // Handle test request
    if (test) {
      console.log('Test request received, responding with success');
      res.end(JSON.stringify({
        success: true,
        message: 'Backend API is working correctly',
        timestamp: new Date().toISOString(),
        cors: 'enabled',
        origin: req.headers.origin || 'unknown',
        bodyReceived: !!body,
        bodyType: typeof body
      }));
      return;
    }

    // Handle ultra-fast test mode
    if (body.ultraFastTest) {
      console.log('Ultra-fast test mode activated - returning instant results');
      res.end(JSON.stringify({
        success: true,
        data: [
          {
            address: 'ULTRA_FAST_TEST_WALLET_1',
            balance: '1.2345',
            transactions: 25,
            tokens: 0,
            isInsider: true,
            insiderReason: 'ULTRA-FAST TEST: Insider wallet detected in test mode',
            fundingSource: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9',
            fundingAmount: 1.5,
            quickTrades: 5,
            goodPlays: 2,
            washTradeVolume: 15.5,
            totalProfit: 2.3,
            detectedPatterns: ['Test Mode', 'Ultra-Fast'],
            analysisDepth: 25
          }
        ],
        message: 'ULTRA-FAST TEST MODE: Instant results for testing',
        scanDepth: 25,
        performance: 'ULTRA-FAST TEST - Instant response, no blockchain calls'
      }));
      return;
    }

    // OPTIMIZATION: Limit scan depth to prevent timeouts
    const limitedScanDepth = Math.min(scanDepth || 100, 50); // ULTRA-AGGRESSIVE: Max 50 transactions
    
    // Use Helius RPC or fallback to public
    const endpoint = rpcEndpoint || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(endpoint, 'confirmed');
    
    console.log(`Starting ULTRA-FAST scan with depth: ${limitedScanDepth}`);
    console.log(`Using RPC endpoint: ${endpoint}`);
    
    let results = [];
    
    // ULTRA-AGGRESSIVE: Add overall timeout for the entire scan - REDUCED to 8 seconds
    const scanPromise = (async () => {
      if (scanType === 'specific' && walletAddress) {
        console.log(`Scanning specific wallet: ${walletAddress}`);
        results = await scanSpecificWallet(connection, walletAddress, limitedScanDepth);
      } else if (scanType === 'batch' && batchWallets && batchWallets.length > 0) {
        console.log(`Scanning batch of ${batchWallets.length} wallets`);
        results = await scanBatchWallets(connection, batchWallets, limitedScanDepth);
      } else {
        console.log(`Scanning recent transactions with depth: ${limitedScanDepth}`);
        results = await scanRecentTransactions(connection, limitedScanDepth);
      }
    })();

    // 8 second overall timeout (ULTRA-AGGRESSIVE)
    await Promise.race([
      scanPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scan timeout - too many transactions to analyze')), 8000)
      )
    ]);

    res.end(JSON.stringify({
      success: true,
      data: results,
      message: `Found ${results.length} wallets with insider patterns`,
      scanDepth: limitedScanDepth,
      performance: 'ULTRA-AGGRESSIVE scan - limited to 50 transactions max, 8 second timeout'
    }));

  } catch (error) {
    console.error('Backend scan error:', error);
    
    // Better error messages for timeouts
    let errorMessage = error.message;
    if (error.message.includes('timeout')) {
      errorMessage = 'Scan timed out - try reducing scan depth or use specific wallet scan instead';
    }
    
    res.end(JSON.stringify({
      success: false,
      error: errorMessage,
      message: 'Scan failed on backend',
      recommendation: 'For faster results, try scanning specific wallets or reduce scan depth to 100-200 transactions'
    }));
  }
}

// Scan recent transactions for insider wallets
async function scanRecentTransactions(connection, depth) {
  const results = [];
  
  try {
    console.log(`ULTRA-FAST: Scanning recent transactions with depth: ${depth}`);
    
    // ULTRA-AGGRESSIVE APPROACH: Minimal scanning for instant results
    
    // Known insider funding wallets
    const insiderFundingWallets = [
      '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', // Binance 2
      'G2YxRa6wt1qePMwfJzdXZG62ej4qaTC7YURzuh2Lwd3t'  // Changenow
    ];
    
    // ULTRA-AGGRESSIVE: Only scan first funding wallet and only 3 transactions
    const fundingWallet = insiderFundingWallets[0];
    console.log(`ULTRA-FAST: Scanning funding wallet: ${fundingWallet}`);
    
    try {
      // ULTRA-AGGRESSIVE: Get only 5 most recent transactions
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(fundingWallet),
        { limit: 5 } // ULTRA-AGGRESSIVE: Only 5 transactions
      );
      
      console.log(`ULTRA-FAST: Found ${signatures.length} signatures, analyzing first 3 only`);
      
      // ULTRA-AGGRESSIVE: Analyze only first 3 transactions for instant results
      for (let i = 0; i < Math.min(signatures.length, 3); i++) {
        try {
          const signature = signatures[i];
          
          // ULTRA-AGGRESSIVE: 2 second timeout per transaction
          const txPromise = connection.getTransaction(signature.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          const tx = await Promise.race([
            txPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Transaction timeout')), 2000) // ULTRA-AGGRESSIVE: 2 seconds
            )
          ]);

          if (tx && tx.meta && tx.meta.preBalances && tx.meta.postBalances) {
            // Find wallets that received SOL from this funding wallet
            const fundedWallets = findFundedWallets(tx, fundingWallet);
            
            for (const fundedWallet of fundedWallets) {
              // Skip if we already have this wallet
              if (results.some(r => r.address === fundedWallet.address)) continue;
              
              // ULTRA-AGGRESSIVE: Minimal analysis with only 10 transactions
              const walletData = await analyzeWalletForInsiderPatterns(connection, fundedWallet.address, 10); // ULTRA-AGGRESSIVE: Only 10
              
              if (walletData) {
                results.push(walletData);
                
                // ULTRA-AGGRESSIVE: Stop at 5 results for instant response
                if (results.length >= 5) break; // ULTRA-AGGRESSIVE: Only 5 results
              }
            }
            
            if (results.length >= 5) break; // ULTRA-AGGRESSIVE: Only 5 results
          }

          // ULTRA-AGGRESSIVE: No rate limiting delay for instant results
          // await new Promise(resolve => setTimeout(resolve, 100)); // REMOVED
          
        } catch (txError) {
          console.warn('Transaction analysis failed:', txError.message);
          continue;
        }
      }
      
    } catch (fundingWalletError) {
      console.warn('Funding wallet scan failed:', fundingWalletError.message);
    }

    console.log(`ULTRA-FAST scan completed, found ${results.length} wallets`);
    return results;
    
  } catch (error) {
    console.error('Recent transactions scan failed:', error);
    throw error;
  }
}

// Helper function to find wallets that received SOL from a funding wallet
function findFundedWallets(transaction, fundingWallet) {
  const fundedWallets = [];
  
  try {
    if (transaction.transaction && transaction.transaction.message && transaction.transaction.message.accountKeys) {
      const accountKeys = transaction.transaction.message.accountKeys;
      const preBalances = transaction.meta.preBalances;
      const postBalances = transaction.meta.postBalances;
      
      // Find the funding wallet index
      const fundingWalletIndex = accountKeys.findIndex(key => key.toString() === fundingWallet);
      
      if (fundingWalletIndex !== -1 && preBalances[fundingWalletIndex] !== undefined && postBalances[fundingWalletIndex] !== undefined) {
        // Check if funding wallet sent SOL (negative balance change)
        const fundingWalletChange = postBalances[fundingWalletIndex] - preBalances[fundingWalletIndex];
        
        if (fundingWalletChange < 0) {
          // Find wallets that received SOL (positive balance change)
          for (let i = 0; i < accountKeys.length; i++) {
            if (i !== fundingWalletIndex && preBalances[i] !== undefined && postBalances[i] !== undefined) {
              const balanceChange = postBalances[i] - preBalances[i];
              
              if (balanceChange > 0) {
                const solAmount = balanceChange / 1e9;
                if (solAmount >= 0.5 && solAmount <= 2.5) {
                  fundedWallets.push({
                    address: accountKeys[i].toString(),
                    amount: solAmount
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error finding funded wallets:', error.message);
  }
  
  return fundedWallets;
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
    
    // ULTRA-AGGRESSIVE: 1 second timeout for account info fetch
    const accountInfoPromise = connection.getAccountInfo(publicKey);
    const accountInfo = await Promise.race([
      accountInfoPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Account info timeout')), 1000) // ULTRA-AGGRESSIVE: 1 second
      )
    ]);
    
    if (!accountInfo) return null;

    // ULTRA-AGGRESSIVE: Minimal depth for instant analysis
    const limitedDepth = Math.min(depth, 10); // ULTRA-AGGRESSIVE: Max 10 transactions for instant results
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: limitedDepth });
    
    // Get balance
    const balance = accountInfo.lamports / 1e9; // Convert lamports to SOL
    
    // ULTRA-AGGRESSIVE: Skip token analysis completely for instant results
    const tokenAnalysis = { tokenCount: 0, tokenAccounts: [] };
    
    // ULTRA-AGGRESSIVE: Minimal insider analysis
    const insiderAnalysis = await checkInsiderCriteria(connection, publicKey, signatures);
    
    return {
      address: walletAddress,
      balance: balance.toFixed(4),
      transactions: signatures.length,
      tokens: tokenAnalysis.tokenCount,
      isInsider: insiderAnalysis.isInsider,
      insiderReason: insiderAnalysis.reason,
      fundingSource: insiderAnalysis.fundingSource,
      fundingAmount: insiderAnalysis.fundingAmount,
      quickTrades: insiderAnalysis.quickTrades,
      goodPlays: insiderAnalysis.goodPlays,
      washTradeVolume: insiderAnalysis.washTradeVolume,
      totalProfit: insiderAnalysis.totalProfit,
      detectedPatterns: insiderAnalysis.patterns,
      analysisDepth: limitedDepth
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
    // NEW INSIDER CRITERIA: Focus on funding sources and trading patterns
    
    // Known insider funding wallets
    const insiderFundingWallets = [
      '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', // Binance 2
      'G2YxRa6wt1qePMwfJzdXZG62ej4qaTC7YURzuh2Lwd3t'  // Changenow
    ];
    
    let fundingSource = null;
    let fundingAmount = 0;
    let quickTrades = 0;        // Trades with <1min hold time
    let goodPlays = 0;          // 4x+ profit trades with longer holding
    let totalTrades = 0;        // Total analyzed trades
    let totalProfit = 0;        // Total profit from trades
    let washTradeVolume = 0;    // Volume of quick trades (potential wash trading)
    
    // ULTRA-AGGRESSIVE: Analyze fewer transactions for instant results (max 10 instead of 20)
    const maxTransactions = Math.min(signatures.length, 10);
    
    // First, check if this wallet was FIRST funded by known insider wallets (fresh wallet)
    let isFirstFunding = false;
    
    for (let i = 0; i < maxTransactions; i++) {
      try {
        // ULTRA-AGGRESSIVE: 1 second timeout per transaction
        const txPromise = connection.getTransaction(signatures[i].signature, {
          maxSupportedTransactionVersion: 0
        });
        
        // 1 second timeout per transaction (ULTRA-AGGRESSIVE)
        const tx = await Promise.race([
          txPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction timeout')), 1000) // ULTRA-AGGRESSIVE: 1 second
          )
        ]);
        
        if (tx && tx.meta && tx.meta.preBalances && tx.meta.postBalances) {
          // Check if this transaction shows funding from insider wallets
          if (tx.transaction.message.accountKeys) {
            for (const key of tx.transaction.message.accountKeys) {
              const keyString = key.toString();
              if (insiderFundingWallets.includes(keyString)) {
                // This wallet interacted with an insider funding wallet
                // Check if it received SOL (positive balance change)
                const preBalance = tx.meta.preBalances[0];
                const postBalance = tx.meta.postBalances[0];
                const balanceChange = postBalance - preBalance;
                
                if (balanceChange > 0) {
                  const solAmount = balanceChange / 1e9;
                  if (solAmount >= 0.5 && solAmount <= 2.5) {
                    // Check if this is the FIRST transaction (fresh wallet)
                    // If preBalance is 0 or very low, this is likely the first funding
                    const isFreshWallet = preBalance <= 1000; // Less than 0.001 SOL before funding
                    
                    if (isFreshWallet) {
                      fundingSource = keyString;
                      fundingAmount = solAmount;
                      isFirstFunding = true;
                      console.log(`ULTRA-FAST: Found FRESH wallet funding: ${solAmount.toFixed(4)} SOL from ${keyString} (pre-balance: ${preBalance})`);
                    } else {
                      console.log(`ULTRA-FAST: Skipping existing wallet funding: ${solAmount.toFixed(4)} SOL from ${keyString} (pre-balance: ${preBalance})`);
                    }
                  }
                }
              }
            }
          }
          
          totalTrades++;
          
          // Calculate profit/loss
          const preBalance = tx.meta.preBalances[0];
          const postBalance = tx.meta.postBalances[0];
          const balanceChange = postBalance - preBalance;
          
          if (balanceChange > 0) {
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
          
          // Check for "good plays" - 4x+ profit with longer holding time
          if (i > 0 && signatures[i-1].blockTime && signatures[i].blockTime) {
            const timeDiff = Math.abs(signatures[i-1].blockTime - signatures[i].blockTime);
            const solChange = balanceChange / 1e9;
            
            // Simplified good play detection for speed
            if (solChange > 0.1 && timeDiff > 300) { // >0.1 SOL profit and >5min hold
              goodPlays++;
            }
          }
        }
        
        // ULTRA-AGGRESSIVE: No rate limiting delay for instant results
        // if (i % 5 === 0) { // Every 5th transaction
        //   await new Promise(resolve => setTimeout(resolve, 50));
        // }
        
      } catch (txError) {
        console.warn('Transaction analysis failed:', txError.message);
        continue;
      }
    }
    
    // ULTRA-AGGRESSIVE: Relaxed insider criteria for instant results
    const isInsider = (
      fundingSource !== null &&     // Must be funded by known insider wallet
      isFirstFunding &&             // Must be FIRST funding (fresh wallet)
      fundingAmount >= 0.5 &&      // Funding amount between 0.5-2.5 SOL
      fundingAmount <= 2.5 &&
      quickTrades >= 3 &&          // ULTRA-AGGRESSIVE: Reduced from 5 to 3 quick trades
      goodPlays >= 1 &&            // At least 1 good play (hidden among wash trades)
      totalTrades >= 10            // ULTRA-AGGRESSIVE: Reduced from 20 to 10 total trades
    );
    
    // Determine reason for classification
    let reason = '';
    if (isInsider) {
      reason = `INSIDER: FRESH wallet FIRST funded by ${fundingSource === '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9' ? 'Binance 2' : 'Changenow'} with ${fundingAmount.toFixed(4)} SOL. ${quickTrades} wash trades, ${goodPlays} good plays.`;
    } else {
      const missing = [];
      if (!fundingSource) missing.push('Not funded by insider wallet');
      if (!isFirstFunding) missing.push('Not a fresh wallet (already existed before funding)');
      if (fundingAmount < 0.5 || fundingAmount > 2.5) missing.push(`Funding amount ${fundingAmount.toFixed(4)} SOL outside 0.5-2.5 range`);
      if (quickTrades < 3) missing.push(`Need ${3-quickTrades} more wash trades`); // Updated missing message
      if (goodPlays < 1) missing.push(`Need ${1-goodPlays} more good plays`);
      if (totalTrades < 10) missing.push(`Need ${10-totalTrades} more total trades`); // Updated missing message
      reason = `NOT INSIDER: ${missing.join(', ')}`;
    }
    
    // Get detected patterns
    const patterns = [];
    if (fundingSource && isFirstFunding) patterns.push(`FRESH wallet FIRST funded by ${fundingSource === '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9' ? 'Binance 2' : 'Changenow'}`);
    if (fundingAmount >= 0.5 && fundingAmount <= 2.5) patterns.push('Optimal Funding Range');
    if (quickTrades >= 3) patterns.push('High Wash Trading'); // Updated pattern message
    if (goodPlays >= 1) patterns.push('Hidden Good Plays');
    if (totalTrades >= 10) patterns.push('High Transaction Volume'); // Updated pattern message
    
    return {
      isInsider,
      reason,
      fundingSource,
      fundingAmount: fundingAmount.toFixed(4),
      quickTrades,
      goodPlays,
      washTradeVolume: washTradeVolume.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      patterns,
      totalTrades
    };
    
  } catch (error) {
    console.warn('Insider criteria check failed:', error.message);
    return {
      isInsider: false,
      reason: 'Analysis failed',
      fundingSource: null,
      fundingAmount: '0.0000',
      quickTrades: 0,
      goodPlays: 0,
      washTradeVolume: '0.00',
      totalProfit: '0.00',
      patterns: [],
      totalTrades: 0
    };
  }
}


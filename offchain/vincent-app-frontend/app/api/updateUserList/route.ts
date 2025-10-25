import { serverEnv } from '@env/server';
import { NextRequest } from 'next/server';
import client from '../../turso_sql/turso';

const { ethers } = require('ethers');

// VAS Token ABI - only need the Transfer event
const VAS_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];


// @notice Update the user list by fetching VAS mint events and storing new users in the database
// @dev This endpoint is triggered via a cron job (Vercel Functions)
// @dev Expected database schema: users table with columns: id (INTEGER PRIMARY KEY), address (TEXT UNIQUE), block_number (INTEGER)
export async function GET(request: NextRequest) {
  try {
    // Verify authorization (optional - uncomment if you want to protect this endpoint)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Get the last created_at date from the users table
    const lastBlockNumberResult = await client.execute(
      'SELECT block_number FROM users ORDER BY block_number DESC LIMIT 1'
    );

    let fromBlock: number;    
    if (lastBlockNumberResult.rows.length > 0) {
      fromBlock = Number(lastBlockNumberResult.rows[0].block_number);

    } else {
      // If no users exist, start from a recent block (e.g., last 1000 blocks)
      const provider = new ethers.providers.JsonRpcProvider(serverEnv.RPC_URL);
      const currentBlock = await provider.getBlockNumber();
      fromBlock = Math.max(0, currentBlock - 1000);
    }

    // Step 2: Get VAS mint events (Transfer events from address(0))
    const provider = new ethers.providers.JsonRpcProvider(serverEnv.RPC_URL);
    const vasContract = new ethers.Contract(serverEnv.VAS_ADDRESS, VAS_ABI, provider);

    console.log(`Fetching mint events from block ${fromBlock} to latest...`);
    
    // Query Transfer events where 'from' is the zero address (minting)
    const mintEvents = await vasContract.queryFilter(
      vasContract.filters.Transfer(
        ethers.constants.AddressZero, // from: 0x0000... (mint events)
        null, // to: any address
        null  // value: any amount
      ),
      fromBlock,
      'latest'
    );

    console.log(`Found ${mintEvents.length} mint events from blocks ${fromBlock} to latest`);

    // Step 3: Insert new users into the table using batch INSERT OR IGNORE
    let newUsersCount = 0;
    let uniqueAddressesCount = 0;
    const processedAddresses = new Set<string>();
    const usersToInsert: Array<{ address: string; blockNumber: number }> = [];

    // Collect unique users and their block numbers
    for (const event of mintEvents) {
      const userAddress = event.args?.to?.toLowerCase();
      const blockNumber = event.blockNumber;
      
      if (!userAddress || processedAddresses.has(userAddress)) {
        continue; // Skip if already processed in this batch
      }
      
      processedAddresses.add(userAddress);
      usersToInsert.push({
        address: userAddress,
        blockNumber: blockNumber
      });
    }
    
    uniqueAddressesCount = usersToInsert.length;

    // Batch insert users using INSERT OR IGNORE
    if (usersToInsert.length > 0) {
      try {
        // Build bulk insert query
        let sql_query = `INSERT OR IGNORE INTO users (address, block_number) VALUES `;
        for (let i = 0; i < usersToInsert.length-1; i++) {
          sql_query += `(${usersToInsert[i].address}, ${usersToInsert[i].blockNumber}), `;
        }
        const lastUser = usersToInsert[usersToInsert.length-1];
        sql_query += `(${lastUser.address}, ${lastUser.blockNumber});`;

        const insertResult = await client.execute(sql_query);

        // Calculate how many were actually inserted (rowsAffected tells us)
        newUsersCount = insertResult.rowsAffected || 0;
        
        console.log(`Attempted to insert ${usersToInsert.length} users, ${newUsersCount} were new`);
      } catch (error) {
        console.error('Error batch inserting users:', error);
        throw error; // Re-throw to be caught by outer try-catch
      }
    }

    const response = {
      success: true,
      fromBlock,
      toBlock: 'latest',
      mintEventsFound: mintEvents.length,
      uniqueAddressesProcessed: uniqueAddressesCount,
      newUsersAdded: newUsersCount,
      message: `Successfully processed ${mintEvents.length} mint events, found ${uniqueAddressesCount} unique addresses, and added ${newUsersCount} new users`
    };

    console.log('Update complete:', response);
    return Response.json(response);

  } catch (error) {
    console.error('Error updating user list:', error);
    return Response.json({ 
      success: false,
      error: 'Failed to update user list',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

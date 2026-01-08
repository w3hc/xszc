import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL } from '@/config/contract'

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API] Received request body:', JSON.stringify(body, null, 2))

    const { author, x, y, colorIndex, deadline, signature } = body

    // Validate required parameters
    if (!author || x === undefined || y === undefined || colorIndex === undefined || !deadline || !signature) {
      console.error('[API] Missing parameters:', { author, x, y, colorIndex, deadline, signature: signature ? 'present' : 'missing' })
      return NextResponse.json(
        { error: 'Missing required parameters: author, x, y, colorIndex, deadline, signature' },
        { status: 400 }
      )
    }

    // Check if relayer private key is configured
    if (!RELAYER_PRIVATE_KEY) {
      console.error('[API] RELAYER_PRIVATE_KEY not configured')
      return NextResponse.json(
        { error: 'Relayer not configured' },
        { status: 500 }
      )
    }

    // Validate author address
    if (!ethers.isAddress(author)) {
      return NextResponse.json({ error: 'Invalid author address' }, { status: 400 })
    }

    // Validate colorIndex
    if (colorIndex < 0 || colorIndex > 3) {
      return NextResponse.json({ error: 'Invalid colorIndex (must be 0-3)' }, { status: 400 })
    }

    // Note: Deadline validation removed as we use long-term deadlines (10 years)
    // The signature is created and used immediately in practice

    // Split signature into v, r, s components
    console.log('[API] Parsing signature:', signature)
    const sig = ethers.Signature.from(signature)
    console.log('[API] Signature components:', { v: sig.v, r: sig.r, s: sig.s })

    // Create provider and relayer wallet (relayer pays gas)
    console.log('[API] Connecting to RPC:', RPC_URL)
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider)
    console.log('[API] Relayer address:', relayerWallet.address)

    // Create contract instance with relayer signer
    console.log('[API] Creating contract instance at:', CONTRACT_ADDRESS)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, relayerWallet)

    // Submit the transaction to the blockchain (relayer pays gas, user's signature proves authorization)
    console.log('[API] Submitting transaction with params:', { author, x, y, colorIndex, deadline })
    console.log('[API] Coordinate types:', { xType: typeof x, yType: typeof y, xValue: x, yValue: y })

    const tx = await contract.setPixelWithSignature(
      author,
      x,
      y,
      colorIndex,
      deadline,
      sig.v,
      sig.r,
      sig.s
    )
    console.log('[API] Transaction submitted:', tx.hash)

    // Wait for transaction confirmation
    const receipt = await tx.wait()
    console.log('[API] Transaction confirmed in block:', receipt.blockNumber)

    // Verify the pixel was set correctly by reading it back
    try {
      const setColor = await contract.getPixel(x, y)
      const setAuthor = await contract.getPixelAuthor(x, y)
      console.log('[API] Verification - pixel read back from contract:', {
        coordinates: { x, y },
        expectedColor: colorIndex,
        actualColor: Number(setColor),
        colorMatch: Number(setColor) === colorIndex,
        expectedAuthor: author,
        actualAuthor: setAuthor,
        authorMatch: setAuthor.toLowerCase() === author.toLowerCase(),
      })
    } catch (verifyError) {
      console.error('[API] Error verifying pixel:', verifyError)
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    })
  } catch (error) {
    console.error('[API] Error relaying transaction:', error)
    if (error instanceof Error) {
      console.error('[API] Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Failed to relay transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

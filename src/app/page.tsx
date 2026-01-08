'use client'

import { Box, Text } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { getGridState, convertGridToSquares, subscribeToEvents } from '@/lib/contract'
import GridSquare from '@/components/GridSquare'
import { useW3PK } from '@/context/W3PK'
import { CONTRACT_ADDRESS, CHAIN_ID } from '@/config/contract'

type Square = {
  id: string
  gridX: number
  gridY: number
  color: 'purple' | 'blue' | 'white' | 'black'
}

const SQUARE_SIZE = 50

const colors = {
  purple: '#8c1c84',
  blue: '#45a2f8',
  white: '#FFFFFF',
  black: '#000000',
}

const colorCycle: Array<Square['color']> = ['purple', 'blue', 'white', 'black']

export default function Home() {
  const { getAddress, signMessageWithOptions } = useW3PK()
  const [squares, setSquares] = useState<Square[]>([])
  const [maxSize, setMaxSize] = useState(8)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [cursorColor, setCursorColor] = useState('#8c1c84')
  const [viewportOffset, setViewportOffset] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  }))
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [addedPixelsCount, setAddedPixelsCount] = useState(0)
  const [originalSquares, setOriginalSquares] = useState<Square[]>([])
  const [modifiedCoordinates, setModifiedCoordinates] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastClickWasOffGrid, setLastClickWasOffGrid] = useState(false)

  const handleReset = () => {
    setSquares([...originalSquares])
    setModifiedCoordinates(new Set())
    setAddedPixelsCount(0)
  }

  const handleAddPixel = async () => {
    if (isSubmitting || modifiedCoordinates.size === 0) return

    try {
      setIsSubmitting(true)

      // Get the user's address (STANDARD + MAIN)
      const authorAddress = await getAddress('STANDARD', 'MAIN')

      // Get the modified pixel details
      const modifiedCoordinate = Array.from(modifiedCoordinates)[0]
      // Parse coordinates - must handle negative numbers correctly
      // Format is "x-y" where x and y can be negative (e.g., "-3--3")
      const parts = modifiedCoordinate.match(/-?\d+/g)
      if (!parts || parts.length !== 2) {
        throw new Error(`Invalid coordinate format: ${modifiedCoordinate}`)
      }
      const [x, y] = parts.map(Number)

      console.log('[AddPixel] Modified coordinate string:', modifiedCoordinate)
      console.log('[AddPixel] Parsed coordinates:', { x, y })

      // Find the square to get the color
      const modifiedSquare = squares.find(s => s.id === modifiedCoordinate)
      console.log('[AddPixel] Modified square:', modifiedSquare)

      // Verify the square's gridX and gridY match the parsed coordinates
      if (modifiedSquare) {
        console.log('[AddPixel] Coordinate verification:', {
          parsedX: x,
          squareGridX: modifiedSquare.gridX,
          xMatch: x === modifiedSquare.gridX,
          parsedY: y,
          squareGridY: modifiedSquare.gridY,
          yMatch: y === modifiedSquare.gridY,
        })
      }

      // Determine the color index
      let colorIndex: number
      if (!modifiedSquare) {
        // Square was removed (set to black)
        colorIndex = 0
      } else {
        // Map color name to index
        const colorMap: Record<string, number> = {
          black: 0,
          purple: 1,
          blue: 2,
          white: 3,
        }
        colorIndex = colorMap[modifiedSquare.color] || 0
      }

      // Set deadline far in the future (10 years from now) to avoid timing issues
      // The signature is created and used immediately, so we don't need tight deadline constraints
      const deadline = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600

      console.log('[Frontend] Deadline set to:', deadline)

      // Prepare EIP-712 typed data
      const domain = {
        name: 'XiangsuZhongchuang',
        version: '1',
        chainId: CHAIN_ID,
        verifyingContract: CONTRACT_ADDRESS,
      }

      const types = {
        SetPixel: [
          { name: 'author', type: 'address' },
          { name: 'x', type: 'int256' },
          { name: 'y', type: 'int256' },
          { name: 'colorIndex', type: 'uint8' },
          { name: 'deadline', type: 'uint256' },
        ],
      }

      const message = {
        author: authorAddress,
        x: x.toString(),
        y: y.toString(),
        colorIndex: colorIndex.toString(),
        deadline: deadline.toString(),
      }

      // Sign the EIP-712 message using W3PK
      console.log('[Frontend] Signing message:', message)
      console.log('[Frontend] With domain:', domain)
      console.log('[Frontend] And types:', types)

      const signResult = await signMessageWithOptions(JSON.stringify(message), {
        mode: 'STANDARD',
        tag: 'MAIN',
        signingMethod: 'EIP712',
        eip712Domain: domain,
        eip712Types: types,
        eip712PrimaryType: 'SetPixel',
      })

      console.log('[Frontend] Sign result:', signResult)

      if (!signResult) {
        throw new Error('Failed to sign message')
      }

      // Call the API to relay the transaction with the user's signature
      const requestBody = {
        author: authorAddress,
        x,
        y,
        colorIndex,
        deadline,
        signature: signResult.signature,
      }
      console.log('[Frontend] Sending to API:', requestBody)

      const response = await fetch('/api/relay-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to relay transaction')
      }

      await response.json()

      // Reset the modified coordinates after successful submission
      setModifiedCoordinates(new Set())
      setAddedPixelsCount(0)

      // Reload the grid state
      const { max, pixels } = await getGridState()
      setMaxSize(max)
      const contractSquares = convertGridToSquares(pixels, max)
      setSquares(contractSquares)
      setOriginalSquares(contractSquares)
    } catch (err) {
      console.error('Failed to add pixel:', err)
      alert(`Failed to add pixel: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      const dampingFactor = 0.7
      setViewportOffset(prev => ({
        x: prev.x + deltaX * dampingFactor,
        y: prev.y + deltaY * dampingFactor,
      }))
      setDragStart({ x: e.clientX, y: e.clientY })
      setHasDragged(true)
      return
    }

    const scaledSquareSize = SQUARE_SIZE * zoom
    const gridX = Math.floor((e.clientX - viewportOffset.x) / scaledSquareSize)
    const gridY = -Math.floor((e.clientY - viewportOffset.y) / scaledSquareSize) - 1
    setCursorPosition({ x: gridX, y: gridY })

    const gridId = `${gridX}-${gridY}`
    const existingSquare = squares.find(square => square.id === gridId)

    if (existingSquare) {
      const currentColorIndex = colorCycle.indexOf(existingSquare.color)
      const nextColor = colorCycle[(currentColorIndex + 1) % colorCycle.length]
      setCursorColor(colors[nextColor])
    } else {
      setCursorColor(colors.purple)
    }
  }

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDragged) {
      setHasDragged(false)
      return
    }

    // Coordinate System:
    // - Screen space: (0,0) at top-left, x increases right, y increases down
    // - Grid space: (0,0) at center, x increases right, y increases UP (inverted)
    // - Transform: gridX = floor((screenX - offsetX) / size), gridY = -floor((screenY - offsetY) / size) - 1
    const scaledSquareSize = SQUARE_SIZE * zoom
    const gridX = Math.floor((e.clientX - viewportOffset.x) / scaledSquareSize)
    const gridY = -Math.floor((e.clientY - viewportOffset.y) / scaledSquareSize) - 1

    // Check if click is within grid bounds
    const isWithinBounds =
      gridX >= -maxSize && gridX < maxSize && gridY >= -maxSize && gridY < maxSize
    setLastClickWasOffGrid(!isWithinBounds)

    const gridId = `${gridX}-${gridY}`

    console.log('[Click] Screen position:', { clientX: e.clientX, clientY: e.clientY })
    console.log('[Click] Viewport offset:', viewportOffset)
    console.log('[Click] Scaled square size:', scaledSquareSize)
    console.log('[Click] Calculated grid coords:', { gridX, gridY, gridId })
    console.log('[Click] Reverse calculation - expected screen position:', {
      left: gridX * scaledSquareSize + viewportOffset.x,
      top: -gridY * scaledSquareSize - scaledSquareSize + viewportOffset.y,
    })

    const clickedSquareIndex = squares.findIndex(square => square.id === gridId)
    const originalSquare = originalSquares.find(square => square.id === gridId)

    if (clickedSquareIndex !== -1) {
      const clickedSquare = squares[clickedSquareIndex]
      const currentColorIndex = colorCycle.indexOf(clickedSquare.color)
      const nextColor = colorCycle[(currentColorIndex + 1) % colorCycle.length]

      const updatedSquares = [...squares]

      // If next color is black, remove the square
      if (nextColor === 'black') {
        updatedSquares.splice(clickedSquareIndex, 1)
      } else {
        updatedSquares[clickedSquareIndex] = { ...clickedSquare, color: nextColor }
      }

      setSquares(updatedSquares)

      // Check if this coordinate has returned to its original state
      const isBackToOriginal =
        (nextColor === 'black' && !originalSquare) ||
        (originalSquare && nextColor === originalSquare.color)

      setModifiedCoordinates(prev => {
        const newSet = new Set(prev)
        if (isBackToOriginal) {
          newSet.delete(gridId)
        } else {
          newSet.add(gridId)
        }
        setAddedPixelsCount(newSet.size)
        return newSet
      })

      const nextColorIndex = (currentColorIndex + 2) % colorCycle.length
      const colorAfterNext = colorCycle[nextColorIndex]
      setCursorColor(colors[colorAfterNext])
    } else {
      setSquares([...squares, { id: gridId, gridX, gridY, color: 'purple' }])

      // Check if this coordinate exists in original state
      const isBackToOriginal = originalSquare && originalSquare.color === 'purple'

      setModifiedCoordinates(prev => {
        const newSet = new Set(prev)
        if (isBackToOriginal) {
          newSet.delete(gridId)
        } else {
          newSet.add(gridId)
        }
        setAddedPixelsCount(newSet.size)
        return newSet
      })

      setCursorColor(colors.blue)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault()
      setIsDragging(true)
      setHasDragged(false)
      setDragStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (e.button === 0) {
      const timer = setTimeout(() => {
        setIsDragging(true)
        setHasDragged(false)
        setDragStart({ x: e.clientX, y: e.clientY })
      }, 300)
      setLongPressTimer(timer)
    }
  }

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.95 : 1.05
    setZoom(prevZoom => Math.max(0.1, Math.min(5, prevZoom * delta)))
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      setLastTouchDistance(distance)
    } else if (e.touches.length === 1) {
      const touch = e.touches[0]
      const timer = setTimeout(() => {
        setIsDragging(true)
        setHasDragged(false)
        setDragStart({ x: touch.clientX, y: touch.clientY })
      }, 300)
      setLongPressTimer(timer)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      const scale = distance / lastTouchDistance
      setZoom(prevZoom => Math.max(0.1, Math.min(5, prevZoom * scale)))
      setLastTouchDistance(distance)
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStart.x
      const deltaY = touch.clientY - dragStart.y
      const dampingFactor = 0.7
      setViewportOffset(prev => ({
        x: prev.x + deltaX * dampingFactor,
        y: prev.y + deltaY * dampingFactor,
      }))
      setDragStart({ x: touch.clientX, y: touch.clientY })
      setHasDragged(true)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setIsDragging(false)
    setLastTouchDistance(null)
  }

  // Load grid state from contract on mount
  useEffect(() => {
    async function loadGridState() {
      try {
        setIsLoading(true)
        setError(null)
        const { max, pixels } = await getGridState()
        setMaxSize(max)
        const contractSquares = convertGridToSquares(pixels, max)
        setSquares(contractSquares)
        setOriginalSquares(contractSquares)
      } catch (err) {
        console.error('Failed to load grid state:', err)
        setError('Failed to load grid state from contract')
      } finally {
        setIsLoading(false)
      }
    }

    loadGridState()

    // Subscribe to contract events for real-time updates
    const cleanup = subscribeToEvents(
      (_author, x, y, colorIndex) => {
        // Update squares when a pixel is set
        const gridId = `${x}-${y}`
        setSquares(prev => {
          const existingIndex = prev.findIndex(s => s.id === gridId)
          const colorName = ['black', 'purple', 'blue', 'white'][colorIndex] as Square['color']

          if (colorIndex === 0) {
            // Remove the square if it's set to black
            return prev.filter(s => s.id !== gridId)
          } else if (existingIndex !== -1) {
            // Update existing square
            const updated = [...prev]
            updated[existingIndex] = { ...updated[existingIndex], color: colorName }
            return updated
          } else {
            // Add new square
            return [...prev, { id: gridId, gridX: x, gridY: y, color: colorName }]
          }
        })
      },
      newMax => {
        // Update max size when grid expands
        setMaxSize(newMax)
      }
    )

    return cleanup
  }, [])

  if (isLoading) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="#000000"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white" fontSize="sm">
          Loading...
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="#000000"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        gap={4}
      >
        <Text color="red.400" fontSize="xl">
          {error}
        </Text>
        <Text color="gray.400" fontSize="sm">
          Make sure Anvil is running on http://127.0.0.1:8545
        </Text>
      </Box>
    )
  }

  return (
    <>
      {/* Pixel count overlay */}
      <Box
        position="fixed"
        top={4}
        left={4}
        zIndex={1000}
        pointerEvents="auto"
        bg="rgba(0, 0, 0, 0.8)"
        backdropFilter="blur(10px)"
        py={2}
        px={3}
        borderRadius="md"
      >
        <style>
          {`
            @keyframes shimmer {
              100% {
                background-position: -200% center;
              }
              0% {
                background-position: 200% center;
              }
            }
            .shimmer-text {
              background: linear-gradient(
                90deg,
                #8c1c84 0%,
                #45a2f8 25%,
                #ffffff 50%,
                #45a2f8 75%,
                #8c1c84 100%
              );
              background-size: 200% auto;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: shimmer 3s linear infinite;
            }
          `}
        </style>
        <Text
          fontSize="sm"
          color="gray.300"
          cursor={
            addedPixelsCount === 1 && !lastClickWasOffGrid
              ? 'pointer'
              : addedPixelsCount >= 2
                ? 'pointer'
                : 'default'
          }
          onClick={
            addedPixelsCount === 1 && !lastClickWasOffGrid
              ? handleAddPixel
              : addedPixelsCount >= 2
                ? handleReset
                : undefined
          }
          _hover={
            addedPixelsCount === 1 && !lastClickWasOffGrid
              ? { color: 'white' }
              : addedPixelsCount >= 2
                ? { color: 'white' }
                : undefined
          }
          className={
            addedPixelsCount === 1 && !lastClickWasOffGrid && !isSubmitting ? 'shimmer-text' : ''
          }
        >
          {addedPixelsCount === 0 && ''}
          {addedPixelsCount === 1 && lastClickWasOffGrid && 'Off the grid'}
          {addedPixelsCount === 1 &&
            !lastClickWasOffGrid &&
            (isSubmitting ? 'Adding...' : 'Add pixel')}
          {addedPixelsCount >= 2 && 'Reset'}
        </Text>
      </Box>

      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="#000000"
        zIndex={1}
        onClick={handlePageClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={e => e.preventDefault()}
        cursor={isDragging ? 'grabbing' : 'none'}
        style={{ touchAction: 'none' }}
      >
        {squares.map(square => (
          <GridSquare
            key={square.id}
            id={square.id}
            gridX={square.gridX}
            gridY={square.gridY}
            color={colors[square.color]}
            scaledSquareSize={SQUARE_SIZE * zoom}
            viewportOffsetX={viewportOffset.x}
            viewportOffsetY={viewportOffset.y}
          />
        ))}

        {!isDragging && (
          <Box
            position="absolute"
            left={`${cursorPosition.x * SQUARE_SIZE * zoom + viewportOffset.x}px`}
            top={`${-cursorPosition.y * SQUARE_SIZE * zoom - SQUARE_SIZE * zoom + viewportOffset.y}px`}
            w={`${SQUARE_SIZE * zoom}px`}
            h={`${SQUARE_SIZE * zoom}px`}
            border={`${SQUARE_SIZE * zoom * 0.05}px solid`}
            borderColor={cursorColor}
            pointerEvents="none"
            transition="left 0.05s ease-out, top 0.05s ease-out, border-color 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out"
            boxShadow={`0 0 10px ${cursorColor}40`}
          />
        )}
      </Box>
    </>
  )
}

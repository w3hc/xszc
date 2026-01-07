'use client'

import { Box } from '@chakra-ui/react'
import { useState } from 'react'

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
  const [squares, setSquares] = useState<Square[]>([])
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
    const gridY = Math.floor((e.clientY - viewportOffset.y) / scaledSquareSize)
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

    const scaledSquareSize = SQUARE_SIZE * zoom
    const gridX = Math.floor((e.clientX - viewportOffset.x) / scaledSquareSize)
    const gridY = Math.floor((e.clientY - viewportOffset.y) / scaledSquareSize)
    const gridId = `${gridX}-${gridY}`

    const clickedSquareIndex = squares.findIndex(square => square.id === gridId)

    if (clickedSquareIndex !== -1) {
      const clickedSquare = squares[clickedSquareIndex]
      const currentColorIndex = colorCycle.indexOf(clickedSquare.color)
      const nextColor = colorCycle[(currentColorIndex + 1) % colorCycle.length]

      const updatedSquares = [...squares]
      updatedSquares[clickedSquareIndex] = { ...clickedSquare, color: nextColor }
      setSquares(updatedSquares)

      const nextColorIndex = (currentColorIndex + 2) % colorCycle.length
      const colorAfterNext = colorCycle[nextColorIndex]
      setCursorColor(colors[colorAfterNext])
    } else {
      setSquares([...squares, { id: gridId, gridX, gridY, color: 'purple' }])
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

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="#000000"
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
      {squares.map(square => {
        const scaledSquareSize = SQUARE_SIZE * zoom
        return (
          <Box
            key={square.id}
            position="absolute"
            left={`${square.gridX * scaledSquareSize + viewportOffset.x}px`}
            top={`${square.gridY * scaledSquareSize + viewportOffset.y}px`}
            w={`${scaledSquareSize}px`}
            h={`${scaledSquareSize}px`}
            bg={colors[square.color]}
          />
        )
      })}

      {!isDragging && (
        <Box
          position="absolute"
          left={`${cursorPosition.x * SQUARE_SIZE * zoom + viewportOffset.x}px`}
          top={`${cursorPosition.y * SQUARE_SIZE * zoom + viewportOffset.y}px`}
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
  )
}

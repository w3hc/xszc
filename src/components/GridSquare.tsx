import { memo } from 'react'
import { Box } from '@chakra-ui/react'

interface GridSquareProps {
  id: string
  gridX: number
  gridY: number
  color: string
  scaledSquareSize: number
  viewportOffsetX: number
  viewportOffsetY: number
}

const GridSquare = memo<GridSquareProps>(
  ({ gridX, gridY, color, scaledSquareSize, viewportOffsetX, viewportOffsetY }) => {
    return (
      <Box
        position="absolute"
        left={`${gridX * scaledSquareSize + viewportOffsetX}px`}
        top={`${-gridY * scaledSquareSize - scaledSquareSize + viewportOffsetY}px`}
        w={`${scaledSquareSize}px`}
        h={`${scaledSquareSize}px`}
        bg={color}
      />
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.gridX === nextProps.gridX &&
      prevProps.gridY === nextProps.gridY &&
      prevProps.color === nextProps.color &&
      prevProps.scaledSquareSize === nextProps.scaledSquareSize &&
      prevProps.viewportOffsetX === nextProps.viewportOffsetX &&
      prevProps.viewportOffsetY === nextProps.viewportOffsetY
    )
  }
)

GridSquare.displayName = 'GridSquare'

export default GridSquare

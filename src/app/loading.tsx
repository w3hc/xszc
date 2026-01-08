import { Box } from '@chakra-ui/react'
import Spinner from '@/components/Spinner'

export default function Loading() {
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
      zIndex={9999}
    >
      <Spinner size={200} />
    </Box>
  )
}

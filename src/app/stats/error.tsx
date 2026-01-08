'use client'

import { useEffect } from 'react'
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Stats page error:', error)
  }, [error])

  return (
    <VStack gap={8} align="stretch" maxW="4xl" mx="auto" px={6} py={20}>
      <Box>
        <Heading size="2xl" mb={6} color="red.400">
          Something went wrong
        </Heading>
        <Text fontSize="lg" color="white" mb={4}>
          {error.message || 'An unexpected error occurred'}
        </Text>
        <Button colorPalette="blue" onClick={reset}>
          Try again
        </Button>
      </Box>
    </VStack>
  )
}

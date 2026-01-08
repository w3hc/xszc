'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'

export default function DaoPage() {
  return (
    <VStack gap={6} align="center" justify="center" minH="60vh" px={4} py={20}>
      <Box textAlign="center">
        <Heading size="2xl" mb={4} color="orange.400">
          DAO
        </Heading>
        <Text fontSize="3xl" color="gray.400" fontWeight="medium">
          Soon
        </Text>
      </Box>
    </VStack>
  )
}

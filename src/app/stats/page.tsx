'use client'

import { Box, Heading, Text, VStack, Code, Spinner } from '@chakra-ui/react'
import { ListRoot, ListItem } from '@/components/ui/list'
import { useState, useEffect } from 'react'
import { useW3PK } from '@/context/W3PK'
import { getContractStats, getRemainingCooldown } from '@/lib/contract'

type Stats = {
  gridSize: number
  totalPixelsSet: number
  totalMoves: number
  totalCoAuthors: number
  currentTimestamp: number
}

export default function StatsPage() {
  const { getAddress } = useW3PK()
  const [stats, setStats] = useState<Stats | null>(null)
  const [userAddress, setUserAddress] = useState<string>('')
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Format countdown as HH:MM:SS
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return 'Ready to set pixel!'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Load stats and user address
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        // Load contract stats
        const contractStats = await getContractStats()
        setStats(contractStats)

        // Get user address
        try {
          const address = await getAddress('STANDARD', 'MAIN')
          setUserAddress(address)

          // Get cooldown for user
          const cooldown = await getRemainingCooldown(address)
          setCooldownSeconds(cooldown)
        } catch (err) {
          console.log('Could not get user address:', err)
          // Not critical - user might not have wallet connected
        }
      } catch (err) {
        console.error('Failed to load stats:', err)
        setError('Failed to load statistics from contract')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [getAddress])

  // Update countdown timer every second
  useEffect(() => {
    if (cooldownSeconds <= 0) return

    const timer = setInterval(() => {
      setCooldownSeconds(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  if (isLoading) {
    return (
      <VStack gap={8} align="stretch" maxW="4xl" mx="auto" px={6} py={20}>
        <Box display="flex" justifyContent="center" alignItems="center" minH="50vh">
          <Spinner size="xl" color="#45a2f8" />
        </Box>
      </VStack>
    )
  }

  if (error) {
    return (
      <VStack gap={8} align="stretch" maxW="4xl" mx="auto" px={6} py={20}>
        <Box>
          <Heading size="2xl" mb={6} color="#45a2f8">
            Stats
          </Heading>
          <Text fontSize="lg" color="red.400">
            {error}
          </Text>
          <Text fontSize="sm" color="gray.400" mt={2}>
            Make sure Anvil is running on http://127.0.0.1:8545
          </Text>
        </Box>
      </VStack>
    )
  }

  return (
    <VStack gap={8} align="stretch" maxW="4xl" mx="auto" px={6} py={20}>
      <Box>
        <Heading size="2xl" mb={6} color="#45a2f8">
          Stats
        </Heading>
        <Text fontSize="xl" color="white" fontWeight="semibold" mb={8}>
          Live statistics from the collective pixel artwork
        </Text>
      </Box>

      <Box>
        <Heading size="lg" mb={4} color="#45a2f8">
          Your Status
        </Heading>
        <ListRoot gap={4}>
          <ListItem fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Next Pixel:
            </Text>{' '}
            <Code
              fontSize="md"
              bg={cooldownSeconds <= 0 ? 'green.900' : 'gray.800'}
              color={cooldownSeconds <= 0 ? 'green.300' : 'white'}
              px={3}
              py={1}
              borderRadius="md"
            >
              {formatCountdown(cooldownSeconds)}
            </Code>
          </ListItem>
          <ListItem fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Your Address:
            </Text>{' '}
            {userAddress ? (
              <Code fontSize="sm" bg="gray.800" px={2} py={1} borderRadius="md">
                {userAddress}
              </Code>
            ) : (
              <Text as="span" color="gray.500">
                Not connected
              </Text>
            )}
          </ListItem>
        </ListRoot>
      </Box>

      <Box>
        <Heading size="lg" mb={4} color="#45a2f8">
          Global Statistics
        </Heading>
        <ListRoot gap={4}>
          <ListItem fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Total Moves:
            </Text>{' '}
            <Code fontSize="md" bg="gray.800" px={2} py={1} borderRadius="md">
              {stats?.totalMoves.toLocaleString()}
            </Code>
            <Text as="span" fontSize="sm" color="gray.500" ml={2}>
              (all pixel placements)
            </Text>
          </ListItem>
          <ListItem fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Co-Authors:
            </Text>{' '}
            <Code fontSize="md" bg="gray.800" px={2} py={1} borderRadius="md">
              {stats?.totalCoAuthors.toLocaleString()}
            </Code>
            <Text as="span" fontSize="sm" color="gray.500" ml={2}>
              (unique contributors)
            </Text>
          </ListItem>
          <ListItem fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Pixels Set:
            </Text>{' '}
            <Code fontSize="md" bg="gray.800" px={2} py={1} borderRadius="md">
              {stats?.totalPixelsSet.toLocaleString()}
            </Code>
            <Text as="span" fontSize="sm" color="gray.500" ml={2}>
              (current non-black pixels)
            </Text>
          </ListItem>
          <ListItem fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Grid Size:
            </Text>{' '}
            <Code fontSize="md" bg="gray.800" px={2} py={1} borderRadius="md">
              {stats?.gridSize ? `${stats.gridSize * 2 + 1} × ${stats.gridSize * 2 + 1}` : 'N/A'}
            </Code>
            <Text as="span" fontSize="sm" color="gray.500" ml={2}>
              (from -{stats?.gridSize} to +{stats?.gridSize})
            </Text>
          </ListItem>
        </ListRoot>
      </Box>
    </VStack>
  )
}

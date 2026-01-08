'use client'

import { Box, Heading, Text, VStack, Code, Link } from '@chakra-ui/react'
import { ListRoot, ListItem } from '@/components/ui/list'
import { useState, useEffect, memo, useCallback } from 'react'
import { useW3PK } from '@/context/W3PK'
import { getContractStats, getContract, getProvider } from '@/lib/contract'
import { CONTRACT_ADDRESS } from '@/config/contract'
import Spinner from '@/components/Spinner'

type Stats = {
  gridSize: number
  totalPixelsSet: number
  totalMoves: number
  totalCoAuthors: number
  currentTimestamp: number
}

// Memoized component for user status section
const UserStatus = memo(
  ({
    cooldownSeconds,
    userAddress,
    formatCountdown,
  }: {
    cooldownSeconds: number
    userAddress: string
    formatCountdown: (seconds: number) => string
  }) => (
    <Box>
      <Heading size="lg" mb={4} color="#45a2f8">
        Your Status
      </Heading>
      <ListRoot gap={4}>
        <ListItem fontSize="md" color="gray.300">
          <Text as="span" fontWeight="bold" color="white">
            Cooldown Remaining:
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
          <Text as="span" fontSize="sm" color="gray.500" ml={2}>
            (at page load)
          </Text>
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
  )
)

UserStatus.displayName = 'UserStatus'

// Memoized component for global statistics section
const GlobalStats = memo(({ stats }: { stats: Stats | null }) => (
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
))

GlobalStats.displayName = 'GlobalStats'

export default function StatsPage() {
  const { getAddress } = useW3PK()
  const [stats, setStats] = useState<Stats | null>(null)
  const [userAddress, setUserAddress] = useState<string>('')
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Format countdown as HH:MM:SS - memoized to prevent unnecessary re-renders
  const formatCountdown = useCallback((seconds: number): string => {
    if (seconds <= 0) return 'Ready to set pixel!'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Load stats and user address
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        // Parallelize data fetching - load stats and user data simultaneously
        const [contractStats, userDataResult] = await Promise.all([
          getContractStats(),
          (async () => {
            try {
              const address = await getAddress('STANDARD', 'MAIN')

              // Get lastPixelTime and COOLDOWN_PERIOD from contract
              const contract = getContract()
              const provider = getProvider()

              const [lastPixelTime, cooldownPeriod, currentBlock] = await Promise.all([
                contract.lastPixelTime(address),
                contract.COOLDOWN_PERIOD(),
                provider.getBlock('latest'),
              ])

              const currentTimestamp = currentBlock?.timestamp || Math.floor(Date.now() / 1000)
              const lastPixelTimestamp = Number(lastPixelTime)
              const cooldownPeriodSeconds = Number(cooldownPeriod)

              // Calculate remaining cooldown
              const nextAllowedTime = lastPixelTimestamp + cooldownPeriodSeconds
              const cooldown = Math.max(0, nextAllowedTime - currentTimestamp)

              return { address, cooldown }
            } catch (err) {
              console.log('Could not get user address:', err)
              // Not critical - user might not have wallet connected
              return { address: '', cooldown: 0 }
            }
          })(),
        ])

        // Only update state if component is still mounted
        if (isMounted) {
          setStats(contractStats)
          setUserAddress(userDataResult.address)
          setCooldownSeconds(userDataResult.cooldown)
        }
      } catch (err) {
        console.error('Failed to load stats:', err)
        if (isMounted) {
          setError('Failed to load statistics from contract')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [getAddress])

  // No real-time updates - stats are loaded once at page load

  if (isLoading) {
    return (
      <VStack gap={8} align="stretch" maxW="4xl" mx="auto" px={6} py={20}>
        <Box display="flex" justifyContent="center" alignItems="center" minH="50vh">
          <Spinner size={200} />
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
        <Text fontSize="xl" color="white" fontWeight="semibold" mb={4}>
          Live statistics from the collective pixel artwork
        </Text>
        <Text fontSize="sm" color="gray.400">
          Contract:{' '}
          <Link
            href={`https://optimistic.etherscan.io/address/${CONTRACT_ADDRESS}#code`}
            target="_blank"
            rel="noopener noreferrer"
            color="#45a2f8"
            textDecoration="underline"
            _hover={{ color: '#8c1c84' }}
          >
            {CONTRACT_ADDRESS}
          </Link>
        </Text>
      </Box>

      <UserStatus
        cooldownSeconds={cooldownSeconds}
        userAddress={userAddress}
        formatCountdown={formatCountdown}
      />

      <GlobalStats stats={stats} />
    </VStack>
  )
}

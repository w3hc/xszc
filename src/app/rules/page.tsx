'use client'

import { Box, Heading, Text, VStack, Code, Link, List } from '@chakra-ui/react'

export default function RulesPage() {
  return (
    <VStack gap={8} align="stretch" maxW="4xl" mx="auto" px={6} py={20}>
      <Box>
        <Heading size="2xl" mb={6} color="#45a2f8">
          Rules
        </Heading>
        <Text fontSize="2xl" color="white" fontWeight="semibold" mb={8}>
          Anyone can add one pixel per day.
        </Text>
      </Box>

      <Box>
        <Heading size="lg" mb={4} color="#45a2f8">
          How It Works
        </Heading>
        <List.Root
          gap={4}
          pl={6}
          css={{
            '& li::marker': {
              color: '#8c1c84',
            },
          }}
        >
          <List.Item fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              One Pixel Per Day:
            </Text>{' '}
            Each address can set one pixel every 24 hours.
          </List.Item>
          <List.Item fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Four Colors:
            </Text>{' '}
            Choose from black, purple, blue, or white.
            <List.Root
              gap={2}
              mt={2}
              ml={6}
              css={{
                '& li::marker': {
                  color: '#8c1c84',
                },
              }}
            >
              <List.Item fontSize="md" color="gray.300">
                Black (<Code>#000000</Code>)
              </List.Item>
              <List.Item fontSize="md" color="gray.300">
                Purple (<Code>#8c1c84</Code>)
              </List.Item>
              <List.Item fontSize="md" color="gray.300">
                Blue (<Code>#45a2f8</Code>)
              </List.Item>
              <List.Item fontSize="md" color="gray.300">
                White (<Code>#FFFFFF</Code>)
              </List.Item>
            </List.Root>
          </List.Item>
          <List.Item fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Collaborative Canvas:
            </Text>{' '}
            You can overwrite any pixel, including those placed by others.
          </List.Item>
          <List.Item fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Growing Grid:
            </Text>{' '}
            When 80% of the canvas is filled, it automatically expands.
          </List.Item>
        </List.Root>
      </Box>

      <Box>
        <Heading size="lg" mb={4} color="#45a2f8">
          Additional Details
        </Heading>
        <List.Root
          gap={4}
          pl={6}
          css={{
            '& li::marker': {
              color: '#8c1c84',
            },
          }}
        >
          <List.Item fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              BackToBlack Protection:
            </Text>{' '}
            When the grid is ready to expand (80%+ filled), you cannot clear pixels if it would
            prevent expansion.
          </List.Item>
          <List.Item fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Gasless Transactions:
            </Text>{' '}
            Supports EIP-712 signatures for gasless pixel placement via relayers.
          </List.Item>
          <List.Item fontSize="md" color="gray.300">
            <Text as="span" fontWeight="bold" color="white">
              Attribution:
            </Text>{' '}
            Every pixel records its author and all placements emit transparent on-chain events.
          </List.Item>
        </List.Root>
      </Box>

      <Box pt={6} borderTop="1px" borderColor="gray.700">
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Solidity contract:{' '}
          <Link
            href="https://github.com/w3hc/xszc/blob/main/contracts/src/XiangsuZhongchuang.sol"
            color="#45a2f8"
            textDecoration="underline"
            _hover={{ color: '#6bb8ff' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            XiangsuZhongchuang.sol
          </Link>
          {' · '}
          <Link
            href="https://optimistic.etherscan.io/address/0xfdbfa059ed1c7d32ecf2df6bb8b6c46a42a34aba#code"
            color="#45a2f8"
            textDecoration="underline"
            _hover={{ color: '#6bb8ff' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Etherscan
          </Link>
        </Text>
      </Box>
    </VStack>
  )
}

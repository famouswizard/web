import type { CardProps } from '@chakra-ui/react'
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { type FC, useMemo } from 'react'
import { usdcAssetId } from 'test/mocks/accounts'
import { Text } from 'components/Text'

import { WithBackButton } from '../WithBackButton'
import { LimitOrderCard } from './components/LimitOrderCard'
import { LimitOrderStatus } from './types'

type LimitOrderListProps = {
  isLoading: boolean
  cardProps?: CardProps
  onBack?: () => void
}

export const LimitOrderList: FC<LimitOrderListProps> = ({ cardProps, onBack }) => {
  const textColorBaseProps = useMemo(() => {
    return {
      color: 'text.base',
      ...(onBack && {
        bg: 'blue.500',
        px: 4,
        py: 2,
        borderRadius: 'full',
      }),
    }
  }, [onBack])

  // FIXME: Use real data
  const MockOpenOrderCard = () => (
    <LimitOrderCard
      id='1'
      sellAmount={7000000}
      buyAmount={159517.575}
      buyAssetId={usdcAssetId}
      sellAssetId={foxAssetId}
      expiry={7}
      filledDecimalPercentage={0.0888}
      status={LimitOrderStatus.Open}
    />
  )

  const MockHistoryOrderCard = () => (
    <LimitOrderCard
      id='2'
      sellAmount={5000000}
      buyAmount={120000.0}
      buyAssetId={usdcAssetId}
      sellAssetId={foxAssetId}
      expiry={0}
      filledDecimalPercentage={1.0}
      status={LimitOrderStatus.Filled}
    />
  )

  return (
    <Card {...cardProps}>
      <CardHeader px={0} pt={4} h='full' display='flex' flexDirection='column'>
        <Flex width='full' alignItems='center' mb={4} position='relative'>
          <Box position='absolute' left={0}>
            <WithBackButton onBack={onBack} />
          </Box>
          {onBack && (
            <Heading width='full' textAlign='center' fontSize='md'>
              <Text translation='limitOrders.orders' />
            </Heading>
          )}
        </Flex>
        <Tabs variant='unstyled' display='flex' flexDirection='column' h='full'>
          <TabList gap={4} flex='0 0 auto' mb={2} ml={6}>
            <Tab
              p={0}
              fontSize='md'
              fontWeight='bold'
              color={onBack ? 'text.base' : 'text.subtle'}
              _selected={textColorBaseProps}
            >
              <Text translation='limitOrders.openOrders' />
            </Tab>
            <Tab
              p={0}
              fontSize='md'
              fontWeight='bold'
              color={onBack ? 'text.base' : 'text.subtle'}
              _selected={textColorBaseProps}
            >
              <Text translation='limitOrders.orderHistory' />
            </Tab>
          </TabList>

          <TabPanels flex='1' overflowY='auto' minH={0} px={2}>
            <TabPanel px={0}>
              <CardBody px={0} overflowY='auto' flex='1 1 auto'>
                {Array.from({ length: 5 }).map((_, index) => (
                  <MockOpenOrderCard key={index} />
                ))}
              </CardBody>
            </TabPanel>

            <TabPanel px={0}>
              <CardBody px={0} overflowY='auto' flex='1 1 auto'>
                {Array.from({ length: 2 }).map((_, index) => (
                  <MockHistoryOrderCard key={index} />
                ))}
              </CardBody>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardHeader>
    </Card>
  )
}

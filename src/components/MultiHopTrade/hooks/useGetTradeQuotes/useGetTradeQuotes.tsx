import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeQuoteInput, SwapperName, TradeQuote } from '@shapeshiftoss/swapper'
import {
  DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  isExecutableTradeQuote,
  swappers,
} from '@shapeshiftoss/swapper'
import { isThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/getThorTradeQuoteOrRate/getTradeQuoteOrRate'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTradeQuoteInput } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteInput'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useHasFocus } from 'hooks/useHasFocus'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { ApiQuote, TradeQuoteError } from 'state/apis/swapper/types'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUsd,
  selectInputSellAsset,
  selectLastHopBuyAccountId,
  selectPortfolioAccountMetadataByAccountId,
  selectUsdRateByAssetId,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteMetaOrDefault,
  selectHopExecutionMetadata,
  selectIsAnyTradeQuoteLoading,
  selectSortedTradeQuotes,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import type { UseGetSwapperTradeQuoteArgs } from './hooks.tsx/useGetSwapperTradeQuote'
import { useGetSwapperTradeQuote } from './hooks.tsx/useGetSwapperTradeQuote'

type MixPanelQuoteMeta = {
  swapperName: SwapperName
  differenceFromBestQuoteDecimalPercentage: number
  quoteReceived: boolean
  isStreaming: boolean
  isLongtail: boolean
  errors: TradeQuoteError[]
  isActionable: boolean // is the individual quote actionable
}

type GetMixPanelDataFromApiQuotesReturn = {
  quoteMeta: MixPanelQuoteMeta[]
  sellAssetId: string
  buyAssetId: string
  sellAssetChainId: string
  buyAssetChainId: string
  sellAmountUsd: string | undefined
  version: string // ISO 8601 standard basic format date
  isActionable: boolean // is any quote in the request actionable
}

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }
const thorVotingPowerParams: { feeModel: ParameterModel } = { feeModel: 'THORSWAP' }

const getMixPanelDataFromApiQuotes = (
  quotes: Pick<ApiQuote, 'quote' | 'errors' | 'swapperName' | 'inputOutputRatio'>[],
): GetMixPanelDataFromApiQuotesReturn => {
  const bestInputOutputRatio = quotes[0]?.inputOutputRatio
  const state = store.getState()
  const { assetId: sellAssetId, chainId: sellAssetChainId } = selectInputSellAsset(state)
  const { assetId: buyAssetId, chainId: buyAssetChainId } = selectInputBuyAsset(state)
  const sellAmountUsd = selectInputSellAmountUsd(state)
  const quoteMeta: MixPanelQuoteMeta[] = quotes
    .map(({ quote, errors, swapperName, inputOutputRatio }) => {
      const differenceFromBestQuoteDecimalPercentage =
        (inputOutputRatio / bestInputOutputRatio - 1) * -1
      return {
        swapperName,
        differenceFromBestQuoteDecimalPercentage,
        quoteReceived: !!quote,
        isStreaming: quote?.isStreaming ?? false,
        isLongtail: quote?.isLongtail ?? false,
        tradeType: isThorTradeQuote(quote) ? quote?.tradeType : null,
        errors: errors.map(({ error }) => error),
        isActionable: !!quote && !errors.length,
      }
    })
    .filter(isSome)

  const isActionable = quoteMeta.some(({ isActionable }) => isActionable)

  // Add a version string, in the form of an ISO 8601 standard basic format date, to the JSON blob to help with reporting
  const version = '20240115'

  return {
    quoteMeta,
    sellAssetId,
    buyAssetId,
    sellAmountUsd,
    sellAssetChainId,
    buyAssetChainId,
    version,
    isActionable,
  }
}

export const useGetTradeQuotes = () => {
  const dispatch = useAppDispatch()
  const {
    state: { wallet },
  } = useWallet()

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeTrade = useAppSelector(selectActiveQuote)
  const activeTradeId = activeTrade?.id
  const activeRateRef = useRef<TradeQuote | undefined>()
  const activeTradeIdRef = useRef<string | undefined>()
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)
  const activeQuoteMetaRef = useRef<{ swapperName: SwapperName; identifier: string } | undefined>()

  useEffect(
    () => {
      activeRateRef.current = activeTrade
      activeTradeIdRef.current = activeTradeId
      activeQuoteMetaRef.current = activeQuoteMeta
    },
    // WARNING: DO NOT SET ANY DEP HERE.
    // We're using this to keep the ref of the rate and matching tradeId for it on mount.
    // This should never update afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const hopExecutionMetadataFilter = useMemo(() => {
    if (!activeTradeId) return undefined

    return {
      tradeId: activeTradeId,
      // TODO(gomes): multi-hop here
      hopIndex: 0,
    }
  }, [activeTradeId])

  const hopExecutionMetadata = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined,
  )

  const quoteOrRate = useMemo(() => {
    return 'quote' as const
  }, [])

  console.log({ hopExecutionMetadata })

  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const hasFocus = useHasFocus()
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )
  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress(useReceiveAddressArgs)
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)

  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)

  const userSlippageTolerancePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

  const sellAccountMetadataFilter = useMemo(
    () => ({
      accountId: sellAccountId,
    }),
    [sellAccountId],
  )

  const buyAccountMetadataFilter = useMemo(
    () => ({
      accountId: buyAccountId,
    }),
    [buyAccountId],
  )

  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountMetadataFilter),
  )
  const receiveAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountMetadataFilter),
  )

  const mixpanel = getMixPanel()

  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))

  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const thorVotingPower = useAppSelector(state => selectVotingPower(state, thorVotingPowerParams))
  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const isBuyAssetChainSupported = walletSupportsBuyAssetChain

  // TODO(gomes): this should *not* refetch, this should refetch the *correct* swapper/quote once and call cache it forever until unmount
  const shouldRefetchTradeQuotes = useMemo(
    () =>
      Boolean(
        hasFocus &&
          // Only fetch quote if the current "quote" is a rate (which we have gotten from input step)
          activeTrade &&
          !isExecutableTradeQuote(activeTrade) &&
          // and if we're actually at pre-execution time
          hopExecutionMetadata?.state === HopExecutionState.AwaitingSwap &&
          wallet &&
          sellAccountId &&
          sellAccountMetadata &&
          receiveAddress &&
          !isVotingPowerLoading,
      ),
    [
      hasFocus,
      activeTrade,
      hopExecutionMetadata?.state,
      wallet,
      sellAccountId,
      sellAccountMetadata,
      receiveAddress,
      isVotingPowerLoading,
    ],
  )

  useEffect(() => {
    // Only run this effect when we're actually ready
    if (hopExecutionMetadata?.state !== HopExecutionState.AwaitingSwap) return
    // And only run it once
    if (activeTrade && isExecutableTradeQuote(activeTrade)) return

    dispatch(swapperApi.util.invalidateTags(['TradeQuote']))

    // Early exit on any invalid state
    if (
      bnOrZero(sellAmountCryptoPrecision).isZero() ||
      (quoteOrRate === 'quote' &&
        (!sellAccountId || !sellAccountMetadata || !receiveAddress || isVotingPowerLoading))
    ) {
      setTradeQuoteInput(skipToken)
      dispatch(tradeQuoteSlice.actions.setIsTradeQuoteRequestAborted(true))
      return
    }
    ;(async () => {
      const sellAccountNumber = sellAccountMetadata?.bip44Params?.accountNumber
      const receiveAssetBip44Params = receiveAccountMetadata?.bip44Params
      const receiveAccountNumber = receiveAssetBip44Params?.accountNumber

      const tradeAmountUsd = bnOrZero(sellAssetUsdRate).times(sellAmountCryptoPrecision)

      const { feeBps, feeBpsBeforeDiscount } = calculateFees({
        tradeAmountUsd,
        foxHeld: bnOrZero(votingPower),
        thorHeld: bnOrZero(thorVotingPower),
        feeModel: 'SWAPPER',
      })

      const potentialAffiliateBps = feeBpsBeforeDiscount.toFixed(0)
      const affiliateBps = feeBps.toFixed(0)

      if (quoteOrRate === 'quote' && sellAccountNumber === undefined)
        throw new Error('sellAccountNumber is required')
      if (quoteOrRate === 'quote' && !receiveAddress) throw new Error('receiveAddress is required')

      const updatedTradeQuoteInput: GetTradeQuoteInput | undefined = await getTradeQuoteInput({
        sellAsset,
        sellAccountNumber,
        receiveAccountNumber,
        sellAccountType: sellAccountMetadata?.accountType,
        buyAsset,
        wallet: wallet ?? undefined,
        quoteOrRate,
        receiveAddress,
        sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
        allowMultiHop: true,
        affiliateBps,
        potentialAffiliateBps,
        // Pass in the user's slippage preference if it's set, else let the swapper use its default
        slippageTolerancePercentageDecimal: userSlippageTolerancePercentageDecimal,
        pubKey:
          wallet && isLedger(wallet) && sellAccountId
            ? fromAccountId(sellAccountId).account
            : undefined,
      })

      setTradeQuoteInput(updatedTradeQuoteInput)
    })()
  }, [
    buyAsset,
    dispatch,
    receiveAddress,
    sellAccountMetadata,
    sellAmountCryptoPrecision,
    sellAsset,
    votingPower,
    thorVotingPower,
    wallet,
    receiveAccountMetadata?.bip44Params,
    userSlippageTolerancePercentageDecimal,
    sellAssetUsdRate,
    sellAccountId,
    isVotingPowerLoading,
    isBuyAssetChainSupported,
    quoteOrRate,
    hopExecutionMetadata?.state,
    activeTrade,
  ])

  const getTradeQuoteArgs = useCallback(
    (swapperName: SwapperName | undefined): UseGetSwapperTradeQuoteArgs => {
      return {
        swapperName,
        tradeQuoteInput,
        // Skip trade quotes fetching which aren't for the swapper we have a rate for
        skip: !swapperName || !shouldRefetchTradeQuotes,
        pollingInterval:
          swappers[swapperName]?.pollingInterval ?? DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
      }
    },
    [shouldRefetchTradeQuotes, tradeQuoteInput],
  )

  const queryStateMeta = useGetSwapperTradeQuote(
    getTradeQuoteArgs(activeQuoteMetaRef.current?.swapperName),
  )

  // true if any debounce, input or swapper is fetching
  const isAnyTradeQuoteLoading = useAppSelector(selectIsAnyTradeQuoteLoading)

  // auto-select the best quote once all quotes have arrived
  useEffect(() => {
    const swapperName = activeQuoteMetaRef.current?.swapperName
    if (!swapperName) return
    if (!queryStateMeta?.data) return
    const quoteData = queryStateMeta.data[swapperName]
    if (!quoteData?.quote) return

    // Set as both confirmed *and* active
    dispatch(tradeQuoteSlice.actions.setConfirmedQuote(quoteData?.quote))
    dispatch(tradeQuoteSlice.actions.setActiveQuote(quoteData))
  }, [activeTrade, activeQuoteMeta, dispatch, queryStateMeta.data])

  // TODO: move to separate hook so we don't need to pull quote data into here
  useEffect(() => {
    if (isAnyTradeQuoteLoading) return
    if (mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(sortedTradeQuotes)
      mixpanel.track(MixPanelEvent.QuotesReceived, quoteData)
    }
  }, [sortedTradeQuotes, mixpanel, isAnyTradeQuoteLoading])
}

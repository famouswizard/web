import { arbitrumNovaChainId, type ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isSolanaChainId } from '@shapeshiftoss/chain-adapters/src/solana/SolanaChainAdapter'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput } from '../../../types'

type ChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId) => boolean

const _filterEvmBuyAssetsBySellAssetId = (
  { assets, sellAsset }: BuyAssetBySellIdInput,
  chainIdPredicate: ChainIdPredicate,
): Asset[] => {
  // evm only
  if (!isEvmChainId(sellAsset.chainId)) return []

  return assets.filter(buyAsset => {
    // evm only AND chain id predicate with no arbitrum nova support for any swappers
    return (
      isEvmChainId(buyAsset.chainId) &&
      chainIdPredicate(buyAsset.chainId, sellAsset.chainId) &&
      buyAsset.chainId !== arbitrumNovaChainId
    )
  })
}

const _filterSolanaBuyAssetsBySellAssetId = (
  { assets, sellAsset }: BuyAssetBySellIdInput,
  chainIdPredicate: ChainIdPredicate,
): Asset[] => {
  // evm only
  if (!isSolanaChainId(sellAsset.chainId)) return []

  return assets.filter(buyAsset => {
    // evm only AND chain id predicate with no arbitrum nova support for any swappers
    return (
      isSolanaChainId(buyAsset.chainId) && chainIdPredicate(buyAsset.chainId, sellAsset.chainId)
    )
  })
}

export const filterSameChainEvmBuyAssetsBySellAssetId = (input: BuyAssetBySellIdInput): Asset[] => {
  const sameChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId): boolean =>
    buyAssetChainId === sellAssetChainId
  return _filterEvmBuyAssetsBySellAssetId(input, sameChainIdPredicate)
}

export const filterCrossChainEvmBuyAssetsBySellAssetId = (
  input: BuyAssetBySellIdInput,
): Asset[] => {
  const crossChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId): boolean =>
    buyAssetChainId !== sellAssetChainId
  return _filterEvmBuyAssetsBySellAssetId(input, crossChainIdPredicate)
}

export const filterSameChainSolanaBuyAssetsBySellAssetId = (
  input: BuyAssetBySellIdInput,
): Asset[] => {
  const sameChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId): boolean =>
    buyAssetChainId === sellAssetChainId
  return _filterSolanaBuyAssetsBySellAssetId(input, sameChainIdPredicate)
}

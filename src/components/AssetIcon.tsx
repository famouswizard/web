import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, Center, Flex, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { memo, useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectAssetById, selectFeeAssetById } from 'state/selectors'
import { useAppSelector } from 'state/store'

import { FoxIcon } from './Icons/FoxIcon'

export const defaultClipPath =
  'polygon( 37.122% 12.175%,37.122% 12.175%,36.79% 16.293%,35.828% 20.199%,34.288% 23.841%,32.224% 27.167%,29.687% 30.125%,26.729% 32.662%,23.403% 34.727%,19.761% 36.266%,15.855% 37.228%,11.737% 37.56%,11.737% 37.56%,11.437% 37.558%,11.138% 37.553%,10.84% 37.545%,10.543% 37.533%,10.247% 37.517%,9.952% 37.498%,9.657% 37.476%,9.364% 37.451%,9.071% 37.422%,8.779% 37.39%,8.779% 37.39%,7.696% 37.329%,6.618% 37.397%,5.568% 37.592%,4.566% 37.91%,3.635% 38.35%,2.795% 38.911%,2.067% 39.589%,1.474% 40.383%,1.036% 41.29%,0.775% 42.309%,0.775% 42.309%,0.667% 43.05%,0.57% 43.795%,0.483% 44.543%,0.408% 45.294%,0.345% 46.049%,0.292% 46.806%,0.251% 47.567%,0.222% 48.331%,0.205% 49.098%,0.199% 49.868%,0.199% 49.868%,0.843% 57.853%,2.709% 65.429%,5.694% 72.492%,9.697% 78.943%,14.618% 84.679%,20.354% 89.6%,26.805% 93.604%,33.869% 96.589%,41.444% 98.454%,49.43% 99.099%,49.43% 99.099%,57.415% 98.454%,64.99% 96.589%,72.054% 93.604%,78.505% 89.6%,84.241% 84.679%,89.162% 78.943%,93.165% 72.492%,96.15% 65.429%,98.016% 57.853%,98.66% 49.868%,98.66% 49.868%,98.016% 41.882%,96.15% 34.307%,93.165% 27.243%,89.162% 20.793%,84.241% 15.056%,78.505% 10.136%,72.054% 6.132%,64.99% 3.147%,57.415% 1.281%,49.43% 0.637%,49.43% 0.637%,48.66% 0.643%,47.893% 0.661%,47.129% 0.69%,46.368% 0.731%,45.61% 0.783%,44.856% 0.847%,44.104% 0.922%,43.357% 1.008%,42.612% 1.105%,41.871% 1.214%,41.871% 1.214%,40.852% 1.475%,39.945% 1.912%,39.151% 2.506%,38.473% 3.233%,37.912% 4.073%,37.472% 5.005%,37.153% 6.006%,36.959% 7.057%,36.891% 8.134%,36.951% 9.218%,36.951% 9.218%,36.983% 9.509%,37.012% 9.802%,37.038% 10.095%,37.06% 10.39%,37.079% 10.685%,37.094% 10.982%,37.106% 11.279%,37.115% 11.577%,37.12% 11.876%,37.122% 12.175% );'
export const bottomClipPath =
  'polygon( 89.817% 19.645%,89.817% 19.645%,89.744% 19.965%,89.656% 20.279%,89.551% 20.586%,89.431% 20.884%,89.294% 21.174%,89.14% 21.454%,88.969% 21.724%,88.782% 21.982%,88.577% 22.228%,88.355% 22.461%,56.017% 54.799%,23.663% 87.153%,23.663% 87.153%,23.426% 87.375%,23.177% 87.58%,22.916% 87.767%,22.645% 87.938%,22.365% 88.091%,22.076% 88.228%,21.778% 88.349%,21.474% 88.454%,21.164% 88.542%,20.848% 88.614%,20.848% 88.614%,23.386% 90.416%,26.039% 92.057%,28.8% 93.532%,31.662% 94.834%,34.619% 95.955%,37.662% 96.888%,40.786% 97.626%,43.984% 98.162%,47.247% 98.489%,50.571% 98.599%,50.571% 98.599%,58.555% 97.955%,66.13% 96.089%,73.193% 93.103%,79.644% 89.099%,85.38% 84.178%,90.301% 78.441%,94.305% 71.991%,97.291% 64.927%,99.157% 57.353%,99.801% 49.368%,99.801% 49.368%,99.691% 46.045%,99.364% 42.781%,98.828% 39.584%,98.09% 36.46%,97.157% 33.416%,96.036% 30.46%,94.735% 27.598%,93.26% 24.837%,91.618% 22.183%,89.817% 19.645% );'
export const topClipPath =
  'polygon( 89.786% 19.645%,89.786% 19.645%,86.937% 16.22%,83.793% 13.067%,80.377% 10.207%,76.708% 7.661%,72.807% 5.449%,68.695% 3.593%,64.394% 2.112%,59.922% 1.029%,55.303% 0.364%,50.555% 0.138%,50.555% 0.138%,49.786% 0.143%,49.019% 0.161%,48.256% 0.191%,47.495% 0.232%,46.738% 0.284%,45.984% 0.347%,45.233% 0.421%,44.485% 0.506%,43.742% 0.601%,43.001% 0.707%,43.001% 0.707%,41.981% 0.968%,41.073% 1.406%,40.279% 1.999%,39.6% 2.725%,39.04% 3.564%,38.599% 4.495%,38.281% 5.496%,38.087% 6.546%,38.018% 7.623%,38.078% 8.707%,38.078% 8.707%,38.109% 8.998%,38.137% 9.29%,38.162% 9.583%,38.184% 9.877%,38.203% 10.172%,38.219% 10.468%,38.231% 10.765%,38.24% 11.062%,38.246% 11.361%,38.247% 11.661%,38.247% 11.661%,37.915% 15.777%,36.953% 19.683%,35.413% 23.324%,33.348% 26.651%,30.811% 29.609%,27.853% 32.146%,24.527% 34.211%,20.885% 35.751%,16.979% 36.713%,12.863% 37.045%,12.863% 37.045%,12.563% 37.043%,12.265% 37.038%,11.967% 37.029%,11.67% 37.017%,11.374% 37.001%,11.079% 36.982%,10.785% 36.96%,10.492% 36.935%,10.2% 36.907%,9.909% 36.876%,9.909% 36.876%,8.825% 36.816%,7.748% 36.884%,6.698% 37.079%,5.697% 37.397%,4.767% 37.838%,3.927% 38.398%,3.201% 39.076%,2.608% 39.871%,2.17% 40.779%,1.909% 41.799%,1.909% 41.799%,1.8% 42.539%,1.702% 43.283%,1.616% 44.031%,1.542% 44.781%,1.48% 45.536%,1.429% 46.293%,1.39% 47.053%,1.362% 47.817%,1.345% 48.584%,1.34% 49.353%,1.34% 49.353%,1.566% 54.101%,2.231% 58.72%,3.315% 63.191%,4.795% 67.493%,6.651% 71.605%,8.863% 75.506%,11.41% 79.175%,14.27% 82.591%,17.423% 85.734%,20.847% 88.584%,20.847% 88.584%,21.163% 88.511%,21.474% 88.423%,21.778% 88.318%,22.075% 88.198%,22.365% 88.061%,22.645% 87.907%,22.916% 87.736%,23.176% 87.549%,23.426% 87.344%,23.663% 87.122%,56.001% 54.784%,88.34% 22.445%,88.34% 22.445%,88.562% 22.208%,88.767% 21.959%,88.954% 21.699%,89.125% 21.428%,89.278% 21.147%,89.415% 20.858%,89.536% 20.561%,89.64% 20.256%,89.729% 19.946%,89.801% 19.63%,89.801% 19.614%,89.786% 19.645% );'
export const squareClipPath =
  'polygon( 7.504% 37.56%,7.504% 37.56%,6.521% 37.641%,5.589% 37.874%,4.719% 38.247%,3.925% 38.747%,3.219% 39.363%,2.613% 40.08%,2.12% 40.886%,1.753% 41.769%,1.523% 42.716%,1.444% 43.714%,1.444% 86.791%,1.444% 86.791%,1.602% 88.787%,2.062% 90.681%,2.797% 92.447%,3.782% 94.06%,4.994% 95.494%,6.406% 96.724%,7.994% 97.725%,9.734% 98.471%,11.599% 98.938%,13.565% 99.099%,86.292% 99.099%,86.292% 99.099%,88.258% 98.938%,90.123% 98.471%,91.863% 97.725%,93.451% 96.724%,94.863% 95.494%,96.075% 94.06%,97.06% 92.447%,97.795% 90.681%,98.255% 88.787%,98.413% 86.791%,98.413% 12.945%,98.413% 12.945%,98.255% 10.948%,97.795% 9.054%,97.06% 7.289%,96.075% 5.676%,94.863% 4.242%,93.451% 3.012%,91.863% 2.011%,90.123% 1.264%,88.258% 0.798%,86.292% 0.637%,43.868% 0.637%,43.868% 0.637%,42.885% 0.718%,41.952% 0.951%,41.083% 1.324%,40.289% 1.824%,39.582% 2.439%,38.977% 3.156%,38.484% 3.963%,38.116% 4.846%,37.887% 5.793%,37.807% 6.791%,37.807% 12.945%,37.807% 12.945%,37.49% 16.937%,36.571% 20.725%,35.101% 24.257%,33.13% 27.482%,30.707% 30.35%,27.882% 32.811%,24.706% 34.813%,21.227% 36.305%,17.497% 37.238%,13.565% 37.56%,7.504% 37.56% );'
export const sansNotchTop =
  'polygon( 89.688% 19.594%,89.688% 19.594%,86.62% 15.966%,83.227% 12.646%,79.532% 9.657%,75.56% 7.025%,71.336% 4.773%,66.883% 2.927%,62.225% 1.51%,57.386% 0.546%,52.392% 0.061%,47.265% 0.078%,47.265% 0.078%,39.942% 1.023%,32.971% 3.005%,26.439% 5.943%,20.431% 9.752%,15.031% 14.352%,10.325% 19.658%,6.398% 25.588%,3.335% 32.06%,1.22% 38.99%,0.141% 46.297%,0.141% 46.297%,0.041% 51.88%,0.536% 57.31%,1.595% 62.558%,3.187% 67.591%,5.281% 72.379%,7.846% 76.89%,10.85% 81.094%,14.262% 84.958%,18.052% 88.453%,22.187% 91.547%,22.187% 91.547%,22.491% 91.707%,22.804% 91.796%,23.118% 91.818%,23.426% 91.777%,23.717% 91.678%,23.983% 91.523%,24.215% 91.318%,24.406% 91.066%,24.545% 90.771%,24.625% 90.438%,24.625% 90.438%,26.613% 80.388%,29.81% 70.826%,34.132% 61.837%,39.494% 53.506%,45.81% 45.918%,52.996% 39.158%,60.967% 33.31%,69.636% 28.461%,78.921% 24.693%,88.734% 22.094%,88.734% 22.094%,89.061% 21.992%,89.345% 21.834%,89.583% 21.628%,89.772% 21.383%,89.908% 21.107%,89.989% 20.811%,90.01% 20.503%,89.969% 20.191%,89.863% 19.885%,89.688% 19.594% );'
export const sansNotchBottom =
  'polygon( 29.875% 95.781%,29.875% 95.781%,32.106% 96.7%,34.39% 97.513%,36.724% 98.218%,39.105% 98.81%,41.529% 99.287%,43.995% 99.646%,46.498% 99.882%,49.036% 99.994%,51.605% 99.977%,54.203% 99.828%,54.203% 99.828%,61.486% 98.674%,68.384% 96.495%,74.816% 93.377%,80.7% 89.403%,85.955% 84.66%,90.5% 79.232%,94.254% 73.203%,97.135% 66.658%,99.062% 59.682%,99.953% 52.359%,99.953% 52.359%,100.006% 49.623%,99.913% 46.921%,99.679% 44.257%,99.307% 41.634%,98.801% 39.057%,98.164% 36.528%,97.401% 34.053%,96.516% 31.635%,95.511% 29.277%,94.391% 26.984%,94.391% 26.984%,94.286% 26.814%,94.163% 26.66%,94.022% 26.523%,93.867% 26.405%,93.699% 26.307%,93.521% 26.23%,93.335% 26.175%,93.143% 26.143%,92.947% 26.137%,92.75% 26.156%,92.75% 26.156%,82.77% 28.407%,73.334% 31.927%,64.536% 36.619%,56.474% 42.387%,49.244% 49.135%,42.943% 56.766%,37.667% 65.185%,33.512% 74.295%,30.575% 84%,28.953% 94.203%,28.953% 94.203%,28.947% 94.403%,28.967% 94.6%,29.01% 94.791%,29.076% 94.973%,29.164% 95.146%,29.273% 95.308%,29.401% 95.456%,29.547% 95.588%,29.711% 95.702%,29.891% 95.797%,29.875% 95.781% );'

type AssetIconProps = {
  assetId?: string
  // Show the network icon instead of the asset icon e.g OP icon instead of ETH for Optimism native asset
  showNetworkIcon?: boolean
} & AvatarProps

// @TODO: this will be replaced with whatever we do for icons later
// The icon prop is used as the placeholder while the icon loads, or if it fails to load.
// Either src or assetId can be passed, if both are passed src takes precedence
type AssetWithNetworkProps = {
  assetId: AssetId
  showNetworkIcon?: boolean
} & AvatarProps

const AssetWithNetwork: React.FC<AssetWithNetworkProps> = ({
  assetId,
  icon,
  src,
  showNetworkIcon = true,
  size,
  ...rest
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const showNetwork = feeAsset?.networkIcon || asset?.assetId !== feeAsset?.assetId
  const iconSrc = src ?? asset?.icon

  return (
    <Center>
      <Center position={showNetwork && showNetworkIcon ? 'relative' : 'static'}>
        {showNetwork && showNetworkIcon && (
          <Avatar
            position='absolute'
            left='-8%'
            top='-8%'
            transform='scale(0.4)'
            transformOrigin='top left'
            icon={icon}
            fontSize='inherit'
            src={feeAsset?.networkIcon ?? feeAsset?.icon}
            size={size}
          />
        )}
        <Avatar
          src={iconSrc}
          icon={icon}
          border={0}
          size={size}
          clipPath={showNetwork && showNetworkIcon ? defaultClipPath : ''}
          {...rest}
        />
      </Center>
    </Center>
  )
}

export const AssetIcon = memo(({ assetId, showNetworkIcon, src, ...rest }: AssetIconProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const assetIconBg = useColorModeValue('gray.200', 'gray.700')
  const assetIconColor = useColorModeValue('text.subtle', 'text.subtle')

  const chainAdapterManager = getChainAdapterManager()
  const chainId = assetId && fromAssetId(assetId).chainId
  const nativeAssetId = chainAdapterManager.get(chainId ?? '')?.getFeeAssetId()
  const foxIcon = useMemo(() => <FoxIcon boxSize='16px' color={assetIconColor} />, [assetIconColor])

  if (assetId === nativeAssetId && asset?.networkIcon && showNetworkIcon) {
    return <Avatar src={asset.networkIcon} bg={assetIconBg} icon={foxIcon} {...rest} />
  }

  if (assetId) {
    if (asset?.icons) {
      return (
        <Flex flexDirection='row' alignItems='center'>
          {asset.icons.map((iconSrc, i) => (
            <Avatar key={i} src={iconSrc} ml={i === 0 ? '0' : '-2.5'} icon={foxIcon} {...rest} />
          ))}
        </Flex>
      )
    }

    return (
      <AssetWithNetwork
        assetId={assetId}
        src={src}
        icon={foxIcon}
        showNetworkIcon={showNetworkIcon}
        {...rest}
      />
    )
  }

  return <Avatar src={src} bg={assetIconBg} icon={foxIcon} {...rest} />
})

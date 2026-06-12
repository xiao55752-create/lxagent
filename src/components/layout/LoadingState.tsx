import { Spin } from 'antd'

interface Props {
  tip?: string
  minHeight?: string
}

export default function LoadingState({ tip = '加载中...', minHeight = '50vh' }: Props) {
  return (
    <div className="loading-state" style={{ minHeight }}>
      <Spin size="large" tip={tip} />
    </div>
  )
}

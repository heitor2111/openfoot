interface RatingBarProps {
  label: string
  value: number
  max: number
  displayValue?: string
}

const RatingBar = ({ label, value, max, displayValue }: RatingBarProps) => {
  const percentage = (value / max) * 100

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-baseline justify-between'>
        <span className='text-[10px] font-semibold tracking-wider text-base-content/40 uppercase'>
          {label}
        </span>
        <span className='text-xs font-bold text-primary'>{displayValue ?? `${value}/${max}`}</span>
      </div>
      <div className='h-1.5 bg-base-300 rounded-full overflow-hidden'>
        <div
          className='h-full bg-primary rounded-full transition-all'
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default RatingBar

interface ColorSwatchProps {
  color: string
  label?: string
}

const ColorSwatch = ({ color, label }: ColorSwatchProps) => (
  <div className='flex items-center gap-1.5'>
    <div
      className='w-4 h-4 rounded-sm border border-base-content/20'
      style={{ backgroundColor: color }}
    />

    {label && <span className='text-xs text-base-content/60'>{label}</span>}
  </div>
)

export default ColorSwatch

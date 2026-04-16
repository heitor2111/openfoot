import IconShirt from '~icons/streamline-flex/shirt-solid'

interface KitSlotProps {
  label: string
  imageRef: string | null
  fallbackColor?: string | null
}

const KitSlot = ({ label, imageRef, fallbackColor }: KitSlotProps) => (
  <div className='flex flex-col items-center gap-1.5'>
    <div className='flex items-center justify-center overflow-hidden'>
      {imageRef ? (
        <img src={imageRef} alt={label} className='w-full h-full object-cover' />
      ) : (
        <IconShirt
          className='text-4xl text-base-content/40'
          style={fallbackColor ? { color: fallbackColor } : undefined}
        />
      )}
    </div>

    <span className='text-[11px] text-base-content/50'>{label}</span>
  </div>
)

export default KitSlot

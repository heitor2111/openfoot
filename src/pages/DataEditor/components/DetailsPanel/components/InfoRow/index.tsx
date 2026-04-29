interface InfoRowProps {
  label: string
  value: React.ReactNode
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className='flex justify-between items-center py-1 gap-4'>
    <span className='text-xs text-base-content/50'>{label}</span>
    <span className='text-xs font-medium text-base-content truncate'>{value}</span>
  </div>
)

export default InfoRow

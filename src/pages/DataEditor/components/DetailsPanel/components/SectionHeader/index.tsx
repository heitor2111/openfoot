interface SectionHeaderProps {
  icon: React.ElementType
  title: string
}

const SectionHeader = ({ icon: Icon, title }: SectionHeaderProps) => (
  <div className='flex items-center gap-2 mb-2'>
    <Icon className='text-primary text-sm' />
    <h3 className='text-xs font-bold tracking-widest text-base-content uppercase m-0'>{title}</h3>
  </div>
)

export default SectionHeader

type IconName =
  | 'search'
  | 'cart'
  | 'login'
  | 'filter'
  | 'home'
  | 'user'
  | 'heart'
  | 'close'
  | 'back'

export function Icon({ name }: { name: IconName }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center ${name === 'back' ? 'rotate-90' : ''}`}
      aria-hidden="true"
    >
      <img src={`/assets/${name}.svg`} alt="" />
    </span>
  )
}

import upload from '../../assets/upload.svg'

export function FolderIcon({ size = 25 }: { size?: number }) {
  return <img src={upload} alt="" style={{ height: size, width: size }} />
}

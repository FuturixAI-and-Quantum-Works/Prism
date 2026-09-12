import folderBlueWave from '../../assets/folder-blue-wave.svg'

export function FileBrowserHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px' }}>
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8.8px',
          background: 'linear-gradient(180deg, #0094FA 0%, #005894 100%)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '4.4px',
            left: '4.4px',
            width: '30px',
            height: '30px',
            backgroundColor: '#F8F8F8',
            borderRadius: '3.8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '3.4px',
              left: '3.4px',
              width: '22.7px',
              height: '1.5px',
              backgroundColor: '#DFDFDF',
              borderRadius: '1.4px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '8.5px',
              left: '3.4px',
              width: '22.7px',
              height: '2.9px',
              backgroundColor: '#DFDFDF',
              borderRadius: '1.4px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '14.4px',
              left: '3.4px',
              width: '22.7px',
              height: '2.9px',
              backgroundColor: '#FAFEFF',
              borderRadius: '1.4px',
            }}
          />
        </div>
        <img
          src={folderBlueWave}
          alt=""
          style={{ position: 'absolute', bottom: 0, left: 0, width: '38px', height: '28px' }}
        />
      </div>
      <div>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.9px',
            display: 'block',
            margin: 0,
          }}
        >
          Files / Documents
        </h2>
        <span style={{ fontSize: '14px', color: '#999999' }}>All files related to this matter</span>
      </div>
    </div>
  )
}

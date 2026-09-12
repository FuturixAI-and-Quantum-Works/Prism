import {
  AssistantIcon,
  HomeIcon,
  LibraryIcon,
  ProjectsIcon,
  ReviewIcon,
  RulebookIcon,
} from '../../components/icons'
import type { NavigationIconName } from './navigationModel'

function ProjectDocumentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 19 19" fill="none">
      <path
        d="M5.93991 3.1665C5.925 2.87241 5.97855 2.64524 6.12417 2.454C6.48587 1.979 7.22265 1.979 8.69623 1.979H10.3038C11.7773 1.979 12.5141 1.979 12.8758 2.454C13.0215 2.64524 13.075 2.87241 13.0601 3.1665"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.95833 6.3335C3.98829 6.12796 4.05712 5.95027 4.17183 5.79066C4.63515 5.146 5.59558 5.146 7.51643 5.146H11.4836C13.4044 5.146 14.3648 5.146 14.8282 5.79066C14.9429 5.95027 15.0117 6.12796 15.0417 6.3335"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.02221 12.4393L3.59132 14.2627C4.30028 16.5341 4.90619 17.0208 7.29146 17.0208H11.7085C14.0938 17.0208 14.6997 16.5341 15.4087 14.2627L15.9778 12.4393C16.5665 10.5531 16.8609 9.61003 16.3955 8.96127C15.9302 8.3125 14.9593 8.3125 13.0177 8.3125H5.98232C4.04067 8.3125 3.06984 8.3125 2.60449 8.96127C2.13914 9.61003 2.4335 10.5531 3.02221 12.4393Z"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SharedProjectsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M9.33333 1.33334H4C3.64638 1.33334 3.30724 1.47382 3.05719 1.72387C2.80714 1.97392 2.66667 2.31305 2.66667 2.66668V13.3333C2.66667 13.687 2.80714 14.0261 3.05719 14.2762C3.30724 14.5262 3.64638 14.6667 4 14.6667H12C12.3536 14.6667 12.6928 14.5262 12.9428 14.2762C13.1929 14.0261 13.3333 13.687 13.3333 13.3333V5.33334L9.33333 1.33334Z"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.33333 1.33334V5.33334H13.3333"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6667 8.66666H5.33333"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6667 11.3333H5.33333"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66667 6H6H5.33333"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SidebarNavigationIcon({ icon }: { icon: NavigationIconName }) {
  switch (icon) {
    case 'assistant':
      return <AssistantIcon size={20} />
    case 'compliance':
      return <SharedProjectsIcon />
    case 'home':
      return <HomeIcon />
    case 'library':
      return <LibraryIcon />
    case 'my-projects':
      return <ProjectDocumentIcon />
    case 'projects':
      return <ProjectsIcon size={19} />
    case 'review':
      return <ReviewIcon />
    case 'rulebook':
      return <RulebookIcon />
    case 'shared-projects':
      return <SharedProjectsIcon />
  }
}

export function NavigationGroupChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

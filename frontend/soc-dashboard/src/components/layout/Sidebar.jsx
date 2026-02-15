import { NavLink } from 'react-router-dom';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowUpOnSquareIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const links = [
  { to: '/', label: 'Dashboard', icon: ChartBarIcon },
  { to: '/incidents', label: 'Incidents', icon: ExclamationTriangleIcon },
  { to: '/upload', label: 'Upload Logs', icon: ArrowUpOnSquareIcon },
  { to: '/about', label: 'About', icon: InformationCircleIcon },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-60 flex-shrink-0 border-r border-slate-800 bg-slate-950/80 text-slate-100 md:flex">
      <nav className="flex w-full flex-col gap-1 p-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-teal-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

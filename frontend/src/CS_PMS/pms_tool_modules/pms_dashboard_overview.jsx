import '../../css_formats/header.css';
import '../../css_formats/sidebar.css';
import '../../css_formats/body_and_container.css';

export function DashboardOverview({ user, handleLogout }) {
  return (
    <div className="card-container">Hello, {user.username}</div>
  );
}
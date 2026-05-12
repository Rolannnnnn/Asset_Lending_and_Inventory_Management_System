import '../../css_formats/header.css';
import '../../css_formats/sidebar.css';
import '../../css_formats/body_and_container.css';

export function Inventory({ user, handleLogout }) {
  return (
    <div className="card-container">Hello, {user.username} This is Inventory</div>
  );
}
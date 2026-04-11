import setupWss from "../../managers/setupWss.js";

export function OptionBar() {
  function handleLogout() {
    setupWss.send("ADMIN_LOGOUT", null);
    window.location.reload();
  }

  return (
    <div className="option-bar">
      <p className="user-info-text">
        You are logged in as <span className="username">admin</span>
      </p>
      <div className="button-bar">
        <button
          className="btn button-bar-btn logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

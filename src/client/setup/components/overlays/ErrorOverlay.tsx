export function ErrorOverlay() {
  return (
    <div className="modal-overlay-error">
      <div className="modal-error">
        <p className="modal-error-text">
          Lost connection. Trying to reconnect...
        </p>
      </div>
    </div>
  );
}

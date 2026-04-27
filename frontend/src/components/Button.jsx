import './Button.css';

const Button = ({ children, variant='primary', size='medium', fullWidth=false, disabled=false, loading=false, icon, onClick, type='button', className='' }) => {
  const cls = `btn btn-${variant} btn-${size} ${fullWidth?'btn-full':''} ${disabled?'btn-disabled':''} ${loading?'btn-loading':''} ${className}`.trim();
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || loading}>
      {loading
        ? <span className="btn-spinner" />
        : <>{icon && <span className="btn-icon">{icon}</span>}<span className="btn-text">{children}</span></>
      }
    </button>
  );
};

export default Button;
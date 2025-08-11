// dashboardStyleHelpers.js
// Pure helpers for dashboard cell styles

export const thStyle = (theme, hasComments, wc) => {
  const borderColor = wc?.border || (theme.name === 'Dark' ? '#bfc4ca' : '#444');
  return {
    padding: '3px 4px',
    border: `1px solid ${borderColor}`,
    background: wc?.header || theme.primary,
    color: wc?.text || theme.text,
    fontSize: 10,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    width: 'auto'
  };
};
export const tdStyle = (theme, wc) => {
  const borderColor = (wc?.border && wc.base) ? wc.border : (theme.name === 'Dark' ? '#bfc4ca40' : '#444');
  return {
    padding: '2px 4px',
    border: `1px solid ${borderColor}`,
    fontSize: 10,
    textAlign: 'center',
    color: wc?.text || theme.text,
    background: wc?.base ? wc.base : 'transparent'
  };
};
export const tdLeft = (theme, wc) => ({
  ...tdStyle(theme, wc),
  textAlign: 'left',
  fontWeight: 500,
  maxWidth: 120,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
});
export const onCell = (theme, wc) => ({
  padding: '3px 6px',
  border: '1px solid ' + (wc?.border || (theme.name === 'Dark' ? '#bfc4ca40' : '#444')),
  fontSize: 11,
  whiteSpace: 'nowrap',
  textAlign: 'left',
  verticalAlign: 'top',
});

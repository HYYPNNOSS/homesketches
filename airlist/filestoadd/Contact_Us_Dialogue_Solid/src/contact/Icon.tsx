const paths = {
  arrow: 'M5 12h14 m-5-5 5 5-5 5',
  check: 'M5 12l4 4L19 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  warning: 'M12 3 2 21h20L12 3Z M12 9v5 m0 3v1',
  send: 'M12 19V5 m-6 6 6-6 6 6',
  chat: 'M20 14a4 4 0 0 1-4 4H9l-5 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z M8 8h8 M8 12h5',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M18 6 6 18',
  minimise: 'M5 12h14',
  chevron: 'M6 9l6 6 6-6',
};

/** Exact icon geometry from the approved HTML reference. */
export function Icon(props: { name: keyof typeof paths }) {
  return <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d={paths[props.name]} /></svg>;
}

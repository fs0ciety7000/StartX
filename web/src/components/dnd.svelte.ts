/** Shared drag state: frames, the grid end and tmux tabs are all drop targets. */
export const MIME = 'application/x-startx-widget';
export const drag = $state({ id: null as string | null, over: null as string | null });

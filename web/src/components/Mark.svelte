<script lang="ts">
  /** StartX mark: Portico's entablature over an X, same stroke grammar as the Portico mark. */
  let { size = 22 }: { size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="96 120 320 320"
  fill="none"
  stroke="currentColor"
  stroke-width="26"
  stroke-linecap="square"
  aria-hidden="true"
>
  <path d="M116 150H396M136 186H376M184 234L328 386M328 234L184 386M116 422H396" />
</svg>

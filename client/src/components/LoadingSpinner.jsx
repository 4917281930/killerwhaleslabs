const sizes = {
  sm: 'h-8 w-8',
  md: 'h-14 w-14',
  lg: 'h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24'
};

export function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div className={`relative grid place-items-center ${sizes[size] || sizes.md} ${className}`} role="status" aria-label="Loading">
      <div className="absolute inset-0 rounded-full p-[3px] kwl-spinner-ring">
        <div className="h-full w-full rounded-full bg-ink" />
      </div>
      <svg className="relative h-[68%] w-[68%] drop-shadow-[0_0_14px_rgba(247,147,26,0.34)]" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#F7931A" />
        <path
          fill="#fff"
          d="M41.1 30.5c2.4-1.2 3.8-3.2 3.5-6.2-.4-4.1-4-5.5-8.5-5.9l1.2-4.8-2.9-.7-1.1 4.6c-.8-.2-1.5-.4-2.3-.5l1.1-4.7-2.9-.7-1.2 4.8-5.8-1.4-.8 3.2s2.1.5 2.1.5c1.2.3 1.4 1.1 1.4 1.7l-3.2 12.9c-.1.4-.5 1-1.4.8 0 0-2.1-.5-2.1-.5l-1.5 3.5 5.8 1.4-1.2 4.9 2.9.7 1.2-4.8c.8.2 1.6.4 2.3.6l-1.2 4.8 2.9.7 1.2-4.9c5 .9 8.8.5 10.4-4 .9-3.6-.2-5.7-2.9-7.1Zm-12.4-9.4 5.4 1.4c2.1.5 3.5 1.4 3 3.5-.5 2-2.3 2.3-4.4 1.8l-5.4-1.3 1.4-5.4Zm-2.1 8.5 6.2 1.5c2.5.6 4.1 1.7 3.5 4.1-.6 2.3-2.7 2.5-5.1 1.9L25 35.6l1.6-6Z"
        />
      </svg>
    </div>
  );
}

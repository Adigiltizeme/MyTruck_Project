import { SVGProps } from 'react';

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 200 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="logo"
    {...props}
  >
    <path
      d="M40 80h120c22.091 0 40-17.909 40-40S182.091 0 160 0H40C17.909 0 0 17.909 0 40s17.909 40 40 40z"
      fill="currentColor"
      className="text-primary"
    />
  </svg>
);

export default Logo;
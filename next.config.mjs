/** @type {import('next').NextConfig} */
const nextConfig = {
 poweredByHeader:false, compress:true,
 experimental:{optimizePackageImports:["lucide-react","@tabler/icons-react"]},
 async headers(){return [{source:"/(.*)",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]}]},
 async redirects(){return [
  {source:"/products",destination:"/departments",permanent:false},
  {source:"/products/:slug",destination:"/departments",permanent:false},
  {source:"/categories",destination:"/departments",permanent:false},
  {source:"/categories/:slug",destination:"/departments",permanent:false},
  {source:"/contact",destination:"/apply",permanent:false},
  {source:"/dashboard",destination:"/portal",permanent:false},
  {source:"/dashboard/:path*",destination:"/portal",permanent:false},
  {source:"/checkout/:path*",destination:"/apply",permanent:false}
 ]},
 turbopack:{root:process.cwd()}
};
export default nextConfig;
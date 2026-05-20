/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "infra",
      home: "aws",

      // Keep your existing safety rules
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
    };
  },

 async run() {
      // DynamoDB table
      const table = sst.aws.Dynamo.get("MV_Portal" , 'MV_Portal');
     const bucket = sst.aws.Bucket.get("MVPortalBucket", "qftestv");
     const site = new sst.aws.Nextjs("MVPortalWebsite", {
       path: "../", // 👈 your Next.js app is here
       server: {
         timeout: "60 seconds"
       },
       environment: {
         TABLE_NAME: table.name,
         // NextAuth
         NEXTAUTH_SECRET: 'mvportal',
         ENCRYPTION_KEY: 'kXpbZnMM3+ddTB7uaWJV9Bv1He6GXg2xlkfEk/d5ca4=',
         SESSION_SECRET: 'kXpbZnMM3+ddTB7uaWJV9Bv1He6GXg2xlkfEk/d5ca4=',
         NODE_ENV: 'production'
       },
       link : [table , bucket]
     });
 
     return {
       SiteUrl: site.url,
       TableName: table.name,
       BucketName : bucket.name,
     };
   },
});

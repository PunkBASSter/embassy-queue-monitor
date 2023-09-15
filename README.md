# Deployment steps
1. Run DeployPackagesBucket.yml to create an S3 bucket to store lambda Zip packages.
2. Upload a ZIP archive with Lambda to the `eqm-packages` bucket.
3. Run DeployCaptchaSolving.yml to create S3 bucket for captchas, a Lambda and policies, roles, permissions.

???

profit...
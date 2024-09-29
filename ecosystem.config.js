const ecosystemConfig = {
  apps: [
    {
      name: "app",
      script: "./jupRewards.js",
      instances: "max",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};

export default ecosystemConfig;

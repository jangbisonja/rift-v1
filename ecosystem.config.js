module.exports = {
  apps: [
    {
      name: "rift-backend",
      cwd: "/home/datanewb/rift-v1/backend",
      interpreter: "/home/datanewb/rift-v1/backend/venv/bin/python",
      script: "/home/datanewb/rift-v1/backend/venv/bin/uvicorn",
      args: "src.main:app --host 127.0.0.1 --port 8000",
      env_file: "/home/datanewb/rift-v1/backend/.env",
      restart_delay: 3000,
    },
    {
      name: "rift-frontend",
      cwd: "/home/datanewb/rift-v1/frontend",
      script: "node_modules/.bin/next",
      args: "start --port 3000",
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 3000,
    },
  ],
};

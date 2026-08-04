pipeline {
    agent any

    environment {
        SSH_CREDENTIALS = 'qassure'
        REMOTE_SERVER = 'ubuntu@160.187.166.60'
        REMOTE_WORKSPACE = '/home/ubuntu'
        PROJECT_NAME = 'qassure-frontend'
        BUILD_PATH = '/home/ubuntu/qassure-frontend'
        DEPLOY_PATH = '/var/www/qassure-ui'
        GIT_CREDENTIALS = 'git-cred'
        REPO_URL = 'https://git.tech4biz.wiki/yashwin/Qassure-frontend.git'
        NPM_PATH = '/home/ubuntu/.nvm/versions/node/v22.22.0/bin/npm'
        NODE_PATH = '/home/ubuntu/.nvm/versions/node/v22.22.0/bin/node'
        EMAIL_RECIPIENT = 'sibarchan.nayak@tech4biz.org'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        retry(2)
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Preparation') {
            steps {
                script {
                    echo "Starting ${PROJECT_NAME} deployment pipeline"
                    echo "Server: ${REMOTE_SERVER}"
                    echo "Build Path: ${BUILD_PATH}"
                    echo "Deploy Path: ${DEPLOY_PATH}"
                }
            }
        }

        stage('Git Operations on Remote Server') {
            steps {
                script {
                    sshagent(credentials: [SSH_CREDENTIALS]) {
                        withCredentials([usernamePassword(credentialsId: GIT_CREDENTIALS, usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                            sh """
                            ssh -o StrictHostKeyChecking=no ${REMOTE_SERVER} '
                                set -e

                                echo "Checking Git repo in home directory..."
                                if [ -d "${BUILD_PATH}/.git" ]; then
                                    echo "Pulling latest code..."
                                    cd ${BUILD_PATH}
                                    
                                    git config --global --add safe.directory ${BUILD_PATH}
                                    git reset --hard
                                    git clean -fd
                                    git config pull.rebase false
                                    git pull https://${GIT_USER}:${GIT_PASS}@git.tech4biz.wiki/yashwin/Qassure-frontend.git main
                                else
                                    echo "Cloning fresh repo..."
                                    rm -rf ${BUILD_PATH}
                                    git clone https://${GIT_USER}:${GIT_PASS}@git.tech4biz.wiki/yashwin/Qassure-frontend.git ${BUILD_PATH}
                                    git config --global --add safe.directory ${BUILD_PATH}
                                fi

                                cd ${BUILD_PATH}
                                echo "Commit: \$(git rev-parse HEAD)"
                            '
                            """
                        }
                    }
                }
            }
        }

        stage('Verify Node.js Environment') {
            steps {
                script {
                    sshagent(credentials: [SSH_CREDENTIALS]) {
                        sh """
                        ssh -o StrictHostKeyChecking=no ${REMOTE_SERVER} '
                            set -e
                            export PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:\$PATH"
                            cd ${BUILD_PATH}

                            echo "Node: \$(${NODE_PATH} -v)"
                            echo "NPM: \$(${NPM_PATH} -v)"
                            ${NPM_PATH} cache clean --force
                        '
                        """
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sshagent(credentials: [SSH_CREDENTIALS]) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${REMOTE_SERVER} '
                        set -e
                        export PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:\$PATH"
                        cd ${BUILD_PATH}
                        echo "Installing dependencies..."
                        rm -rf node_modules package-lock.json
                        ${NPM_PATH} install --force
                    '
                    """
                }
            }
        }

        stage('Build Application') {
            steps {
                sshagent(credentials: [SSH_CREDENTIALS]) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${REMOTE_SERVER} '
                        set -e
                        export PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:\$PATH"
                        cd ${BUILD_PATH}
                        echo "Building application..."
                        ${NPM_PATH} run build
                        echo "Build directory contents:"
                        ls -la dist || ls -la build || echo "No build/dist directory found"
                    '
                    """
                }
            }
        }

        stage('Deploy Static Files') {
            steps {
                sshagent(credentials: [SSH_CREDENTIALS]) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${REMOTE_SERVER} '
                        set -e
                        cd ${BUILD_PATH}
                        
                        echo "Preparing deployment directory..."
                        sudo mkdir -p ${DEPLOY_PATH}
                        sudo rm -rf ${DEPLOY_PATH}/dist
                        sudo rm -rf ${DEPLOY_PATH}/build
                        
                        echo "Moving entire dist folder to ${DEPLOY_PATH}/..."
                        if [ -d "dist" ]; then
                            sudo cp -r dist ${DEPLOY_PATH}/
                            echo "Dist folder copied successfully to ${DEPLOY_PATH}/dist"
                        elif [ -d "build" ]; then
                            sudo cp -r build ${DEPLOY_PATH}/
                            echo "Build folder copied successfully to ${DEPLOY_PATH}/build"
                        else
                            echo "Error: No dist or build directory found!"
                            exit 1
                        fi
                        
                        # Set proper ownership and permissions
                        sudo chown -R www-data:www-data ${DEPLOY_PATH}
                        sudo find ${DEPLOY_PATH} -type d -exec chmod 755 {} \\;
                        sudo find ${DEPLOY_PATH} -type f -exec chmod 644 {} \\;
                        
                        echo "Deployment directory contents:"
                        ls -la ${DEPLOY_PATH}
                    '
                    """
                }
            }
        }

        stage('Restart Nginx') {
            steps {
                sshagent(credentials: [SSH_CREDENTIALS]) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${REMOTE_SERVER} '
                        set -e
                        echo "Testing nginx configuration..."
                        sudo nginx -t
                        
                        echo "Restarting nginx..."
                        sudo systemctl restart nginx
                        
                        echo "Checking nginx status..."
                        sudo systemctl status nginx --no-pager -l
                    '
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sshagent(credentials: [SSH_CREDENTIALS]) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${REMOTE_SERVER} '
                        set -e
                        echo "Verifying deployment..."
                        
                        echo "Build directory structure:"
                        ls -la ${BUILD_PATH}
                        
                        echo "Deployment directory contents:"
                        ls -la ${DEPLOY_PATH}
                        
                        echo "Nginx status:"
                        sudo systemctl is-active nginx
                    '
                    """
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            mail to: "${EMAIL_RECIPIENT}",
                 subject: "✅ Jenkins - ${PROJECT_NAME} Deployment Successful",
                 body: """The deployment of '${PROJECT_NAME}' to ${REMOTE_SERVER} was successful.

Build Number: ${BUILD_NUMBER}
URL: ${BUILD_URL}
Time: ${new Date()}

The static files have been deployed and nginx has been restarted.
"""
        }
        failure {
            mail to: "${EMAIL_RECIPIENT}",
                 subject: "❌ Jenkins - ${PROJECT_NAME} Deployment Failed",
                 body: """Deployment failed. Please review logs at:

${BUILD_URL}console

Time: ${new Date()}
"""
        }
    }
}
pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                dir('/workspace/taskmanager-frontend') {
                    sh 'docker compose -f docker-compose.frontend.test.yml up --build --abort-on-container-exit --exit-code-from frontend-tests frontend-tests'
                }
            }
            post {
                always {
                    dir('/workspace/taskmanager-frontend') {
                        sh 'docker compose -f docker-compose.frontend.test.yml down'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                dir('/workspace/taskmanager-frontend') {
                    sh './scripts/deploy-frontend.sh'
                }
            }
        }
    }
}

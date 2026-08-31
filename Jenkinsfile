pipeline {
    agent any

    stages {
        stage('Deploy') {
            steps {
                dir('/workspace/taskmanager-frontend') {
                    sh './scripts/deploy-frontend.sh'
                }
            }
        }
    }
}

const PROJECTS_LIST_KEY = "qrnodes_project_list";
const PROJECT_KEY_PREFIX = "qrnodes_project_";

function getProjectKey(projectName: string) {
  return PROJECT_KEY_PREFIX + encodeURIComponent(projectName);
}

export function getProjectNames() {
  const stored = localStorage.getItem(PROJECTS_LIST_KEY);
  return stored ? JSON.parse(stored) : [];
}

function setProjectList(projectNames: string[]) {
  localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectNames));
}

export function setProject(name: string, state: string) {
  const projectKey = getProjectKey(name);
  localStorage.setItem(projectKey, state);

  const projectNames = getProjectNames();
  if (!projectNames.includes(name)) {
    projectNames.push(name);
    setProjectList(projectNames);
  }
}

export function getProject(projectName: string) {
  const projectKey = getProjectKey(projectName);
  const stored = localStorage.getItem(projectKey);
  return stored;
}

export function deleteProject(projectName: string) {
  const projectKey = getProjectKey(projectName);
  localStorage.removeItem(projectKey);

  const projectNames = getProjectNames();
  const filteredNames = projectNames.filter((name) => name !== projectName);
  setProjectList(filteredNames);
}

export interface ProjectMetadata {
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedProject {
  metadata: ProjectMetadata;
  state: any;
}

const PROJECTS_LIST_KEY = 'qrnodes_project_list';
const PROJECT_KEY_PREFIX = 'qrnodes_project_';

function getProjectKey(projectName: string): string {
  return PROJECT_KEY_PREFIX + encodeURIComponent(projectName);
}

function getProjectList(): string[] {
  try {
    const stored = localStorage.getItem(PROJECTS_LIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load project list from localStorage:', error);
    return [];
  }
}

function saveProjectList(projectNames: string[]): void {
  try {
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectNames));
  } catch (error) {
    console.error('Failed to save project list to localStorage:', error);
    throw new Error('Failed to save project list');
  }
}

export function getAllProjects(): SavedProject[] {
  try {
    const projectNames = getProjectList();
    const projects: SavedProject[] = [];
    
    for (const projectName of projectNames) {
      const projectKey = getProjectKey(projectName);
      const stored = localStorage.getItem(projectKey);
      if (stored) {
        try {
          const project = JSON.parse(stored);
          projects.push(project);
        } catch (error) {
          console.error(`Failed to parse project ${projectName}:`, error);
        }
      }
    }
    
    return projects;
  } catch (error) {
    console.error('Failed to load projects from localStorage:', error);
    return [];
  }
}

export function saveProject(name: string, state: any, description?: string): string {
  try {
    const now = new Date().toISOString();
    
    let createdAt = now;
    const existing = loadProject(name);
    if (existing) {
      createdAt = existing.metadata.createdAt;
    }
    
    const project: SavedProject = {
      metadata: {
        name,
        description,
        createdAt,
        updatedAt: now
      },
      state
    };
    
    const projectKey = getProjectKey(name);
    localStorage.setItem(projectKey, JSON.stringify(project));
    
    const projectNames = getProjectList();
    if (!projectNames.includes(name)) {
      projectNames.push(name);
      saveProjectList(projectNames);
    }
    
    return name;
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
    throw new Error('Failed to save project');
  }
}

export function loadProject(projectName: string): SavedProject | null {
  try {
    const projectKey = getProjectKey(projectName);
    const stored = localStorage.getItem(projectKey);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load project from localStorage:', error);
    return null;
  }
}

export function deleteProject(projectName: string): boolean {
  try {
    const projectKey = getProjectKey(projectName);
    const stored = localStorage.getItem(projectKey);
    
    if (!stored) {
      return false;
    }
    
    localStorage.removeItem(projectKey);
    
    const projectNames = getProjectList();
    const filteredNames = projectNames.filter(name => name !== projectName);
    saveProjectList(filteredNames);
    
    return true;
  } catch (error) {
    console.error('Failed to delete project from localStorage:', error);
    return false;
  }
}

export function getProjectNames(): string[] {
  try {
    return getProjectList();
  } catch (error) {
    console.error('Failed to get project names:', error);
    return [];
  }
}
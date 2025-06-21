import { createSignal, Show } from "solid-js";
import { useNodesContext } from "../context/NodesContext";

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (projectId: string) => void;
}

export function SaveProjectModal(props: SaveProjectModalProps) {
  const [projectName, setProjectName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  const { saveState } = useNodesContext();

  const handleSave = async () => {
    const name = projectName().trim();
    if (!name) {
      setError("Project name is required");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const projectId = await saveState(name, description().trim() || undefined);
      setProjectName("");
      setDescription("");
      props.onSave?.(projectId);
      props.onClose();
    } catch (error) {
      setError("Failed to save project. Please try again.");
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving()) {
      setProjectName("");
      setDescription("");
      setError("");
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-96 max-w-90vw">
          <h2 class="text-xl font-semibold mb-4 text-gray-100">
            Save Project
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName()}
                onInput={(e) => setProjectName(e.currentTarget.value)}
                placeholder="Enter project name"
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:(outline-none ring-2 ring-blue-500)"
                disabled={isSaving()}
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                placeholder="Enter project description"
                rows={3}
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 resize-none focus:(outline-none ring-2 ring-blue-500)"
                disabled={isSaving()}
              />
            </div>
          </div>

          <Show when={error()}>
            <div class="mt-4 text-red-400 text-sm">
              {error()}
            </div>
          </Show>

          <div class="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={isSaving()}
              class="flex-1 px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 disabled:(opacity-50 cursor-not-allowed)"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving() || !projectName().trim()}
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:(opacity-50 cursor-not-allowed)"
            >
              {isSaving() ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
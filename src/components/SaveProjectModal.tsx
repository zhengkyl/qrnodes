import { Dialog } from "@kobalte/core/dialog";
import { createSignal } from "solid-js";
import { useNodesContext } from "./context/NodesContext";

interface SaveProjectModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function SaveProjectModal(props: SaveProjectModalProps) {
  const [projectName, setProjectName] = createSignal("");

  const { saveStateAs } = useNodesContext();

  const handleSave = async () => {
    const name = projectName().trim();
    if (!name) {
      return;
    }
    saveStateAs(name);
    props.setOpen(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <div class="fixed inset-0 flex items-center justify-center z-50">
          <Dialog.Content class="bg-gray-800 rounded-lg p-6 w-96 max-w-90vw focus:outline-none">
            <Dialog.Title class="text-xl font-semibold mb-4 text-gray-100">
              Save Project
            </Dialog.Title>

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
                />
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <Dialog.CloseButton class="flex-1 px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 disabled:(opacity-50 cursor-not-allowed)">
                Cancel
              </Dialog.CloseButton>
              <button
                onClick={handleSave}
                disabled={!projectName().trim()}
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:(opacity-50 cursor-not-allowed)"
              >
                Save
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

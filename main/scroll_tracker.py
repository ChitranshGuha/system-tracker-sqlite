from pynput import mouse
import sys

identifier = sys.argv[1] if len(sys.argv) > 1 else 'scrolled'

def on_scroll(x, y, dx, dy):
    print(identifier, flush=True)

listener = mouse.Listener(on_scroll=on_scroll)
listener.start()
listener.join()
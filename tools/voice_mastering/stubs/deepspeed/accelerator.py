class _Acc:
    def communication_backend_name(self):
        return "gloo"
def get_accelerator():
    return _Acc()

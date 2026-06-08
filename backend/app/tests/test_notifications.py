import re

def test_mention_regex_extraction():
    """
    Verifies that the regex scanner extracts '@username' tags from chat strings correctly.
    """
    message1 = "Hello @john_doe! Please check this."
    message2 = "Hey @mary and @alex, sync up at 2pm."
    message3 = "No mentions here."
    
    mentions1 = re.findall(r'@(\w+)', message1)
    mentions2 = re.findall(r'@(\w+)', message2)
    mentions3 = re.findall(r'@(\w+)', message3)
    
    assert mentions1 == ["john_doe"]
    assert len(mentions2) == 2
    assert "mary" in mentions2
    assert "alex" in mentions2
    assert len(mentions3) == 0
